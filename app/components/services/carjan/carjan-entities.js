import Component from "@ember/component";
import { inject as service } from "@ember/service";
import { observer } from "@ember/object";

export default Component.extend({
  carjanState: service(),

  entities: null,
  existingEntities: null,
  behaviors: null,
  carModels: null,
  propModels: null,

  async init() {
    this._super(...arguments);
    await this.loadEntities();
    await this.loadCarModels();
    await this.loadPropModels();
    await this.updateExistingEntities(); // Initiales Update
    await this.fetchBehaviors();
  },

  async loadEntities() {
    try {
      const response = await fetch("/assets/carjan/entities.json");
      const entities = await response.json();
      this.set("entities", entities);
    } catch (error) {
      console.error("Error loading entities:", error);
    }
  },

  async loadCarModels() {
    try {
      const response = await fetch("/assets/carjan/car_models.json");
      const carModels = await response.json();
      this.set("carModels", carModels);
    } catch (error) {
      console.error("Error loading car models:", error);
    }
  },

  async loadPropModels() {
    try {
      const response = await fetch("/assets/carjan/prop_models.json");
      const propModels = await response.json();
      this.set("propModels", propModels);
    } catch (error) {
      console.error("Error loading prop models:", error);
    }
  },

  async fetchBehaviors() {
    const sparqlQuery = `
      PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
      PREFIX bt: <http://www.ajan.de/behavior/bt-ns#>
      SELECT ?bt ?label
      WHERE {
        ?bt a bt:BehaviorTree .
        ?bt rdfs:label ?label .
      }
    `;
    const repoURL = `http://localhost:8090/rdf4j/repositories/behaviors`;
    const headers = {
      Accept: "application/sparql-results+json",
      "Content-Type": "application/x-www-form-urlencoded",
    };

    try {
      const response = await fetch(
        `${repoURL}?query=${encodeURIComponent(sparqlQuery)}`,
        { headers }
      );
      if (!response.ok) {
        throw new Error(`Failed to fetch data: ${response.statusText}`);
      }
      const data = await response.json();
      const behaviors = data.results.bindings.map((binding) => ({
        uri: binding.bt.value,
        label: binding.label.value,
      }));
      this.set("behaviors", behaviors);
    } catch (error) {
      console.error("Failed to fetch behavior trees:", error);
    }
  },

  updateExistingEntitiesObserver: observer(
    "carjanState.agentData",
    "carModels",
    "propModels",
    function () {
      // Wenn `carModels` oder `propModels` noch nicht geladen sind, warten
      if (!this.carModels || !this.propModels) {
        return;
      }
      this.updateExistingEntities();
    }
  ),

  async updateExistingEntities() {
    const agentData = this.carjanState.agentData || [];
    const paths = this.carjanState.paths || [];

    const carModels = this.carModels
      ? Object.values(this.carModels).flat()
      : [];
    const propModels = this.propModels
      ? Object.values(this.propModels).flat()
      : [];

    // Fetch behaviors to map behavior labels
    const behaviors = this.behaviors || [];
    const getBehaviorLabel = (behaviorUri) => {
      const behavior = behaviors.find((b) => b.uri === behaviorUri);
      return behavior ? behavior.label : null;
    };

    // Helper function to get path description and color
    const getPathDetails = (pathUri) => {
      const path = paths.find((p) => p.path === pathUri);
      return {
        description: path ? path.description : null,
        pathColor: path ? path.color : "#000000", // Default to black if no color
      };
    };

    const existingEntities = agentData.map((agent) => {
      let imageUrl = null;

      if (agent.type === "Pedestrian") {
        imageUrl = `/assets/carjan/images/pedestrians/${agent.model}.webp`;
      } else if (agent.type === "Vehicle" || agent.type === "Autonomous") {
        const match = carModels.find(
          (model) =>
            model.name === agent.model || model.blueprintId === agent.model
        );
        imageUrl = match
          ? `/assets/carjan/images/car_models/${match.imageUrl}`
          : null;
      } else if (agent.type === "Obstacle") {
        const match = propModels.find(
          (model) =>
            model.name === agent.model || model.blueprintId === agent.model
        );

        imageUrl = match
          ? `/assets/carjan/images/prop_models/${match.imageUrl}`
          : null;
      }

      // Get details for followsPath and fallbackPath
      const followsPathDetails = getPathDetails(agent.followsPath);
      const fallbackPathDetails = getPathDetails(agent.fallbackPath);

      return {
        id: agent.entity,
        type: agent.type,
        label: agent.label,
        model: agent.model,
        color: agent.color,
        followsPath: followsPathDetails.description,
        followsPathColor: followsPathDetails.pathColor,
        fallbackPath: fallbackPathDetails.description,
        fallbackPathColor: fallbackPathDetails.pathColor,
        behavior: getBehaviorLabel(agent.behavior), // Map behavior URI to label
        decisionBox: agent.decisionBox,
        heading: agent.heading,
        position: {
          x: agent.x,
          y: agent.y,
        },
        imageUrl, // Add image URL
      };
    });

    this.set("existingEntities", existingEntities);
  },

  actions: {
    onEntitySelect(entity) {
      const row = entity.position.x;
      const col = entity.position.y;

      this.carjanState.setProperties(entity.type.toLowerCase());
      this.carjanState.set("currentCellPosition", [row, col]);
    },

    reloadEntities() {
      this.updateExistingEntities();
    },
    dragStart(event) {
      const entityType = event.currentTarget.dataset.entityType;

      event.dataTransfer.setData("text", entityType);

      const iconMap = {
        pedestrian: "#pedestrian-icon",
        vehicle: "#vehicle-icon",
        autonomous: "#autonomous-icon",
        obstacle: "#obstacle-icon",
      };

      const dragIconSelector = iconMap[entityType] || "#map-icon";
      const dragIcon = this.element.querySelector(dragIconSelector);

      if (dragIcon) {
        dragIcon.style.width = "12px";
        dragIcon.style.height = "12px";
        dragIcon.style.display = "inline-block";

        event.dataTransfer.setDragImage(dragIcon, 24, 24);
      }

      event.stopPropagation();
    },

    dragLeave(event) {
      event.target.classList.remove("cell-hover-allowed");
      event.target.classList.remove("cell-hover-not-allowed");
      event.target.style.cursor = "move";
    },
  },
});
