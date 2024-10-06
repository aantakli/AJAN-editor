import Component from "@ember/component";
import rdf from "npm:rdf-ext";
import N3Parser from "npm:rdf-parser-n3";
import stringToStream from "npm:string-to-stream";
import rdfGraph from "ajan-editor/helpers/RDFServices/RDF-graph";
import actions from "ajan-editor/helpers/carjan/actions";
import { inject as service } from "@ember/service";
import { observer } from "@ember/object";
import $ from "jquery";

let self;

export default Component.extend({
  dataBus: service("data-bus"),
  ajax: service(),
  store: service(),
  carjanState: service(),

  init() {
    this._super(...arguments);
    self = this;
    rdfGraph.set(rdf.dataset());
  },

  updateObserver: observer("carjanState.updateStatements", function () {
    const statements = this.carjanState.updateStatements;
    rdfGraph.set(rdf.dataset());
    rdfGraph.set(statements);
    this.updateRepo();
  }),

  async getMap(mapName) {
    const response = await fetch("/assets/carjan-maps/maps.json");
    const maps = await response.json();
    return maps[mapName] || maps.map01;
  },

  async getDefaultMap() {
    return await this.getMap("map01");
  },

  didInsertElement() {
    this.loadGrid();
  },

  actions: {
    uploadFile() {
      document.getElementById("fileInput").click();
    },

    downloadFile() {
      this.carjanState.saveRequest();
      setTimeout(() => {
        const link = document.createElement("a");
        link.href =
          "http://localhost:8090/rdf4j/repositories/carjan/statements";
        link.download = "scenario-statements.ttl";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }, 500);
    },

    triggerSaveScenario() {
      this.carjanState.saveRequest();
    },

    async saveAndReset() {
      $("#toast").fadeIn();

      await new Promise((resolve) => setTimeout(resolve, 1000));

      this.saveEditorToRepo();

      $("#toast").fadeOut();
    },

    handleFile(event) {
      if (
        !event ||
        !event.target ||
        !event.target.files ||
        event.target.files.length === 0
      ) {
        return;
      }

      const file = event.target.files[0];

      if (file && file.name.endsWith(".ttl")) {
        const reader = new FileReader();

        reader.onload = (e) => {
          const turtleContent = e.target.result;
          this.parseTurtle(turtleContent).then((result) => {
            this.updateCarjanRepo(result).then(() => {
              this.loadGrid();
            });
          });
        };

        reader.readAsText(file);
      }
    },
  },

  async loadGrid() {
    this.checkRepository().then(() => {
      setTimeout(() => {
        this.loadMapAndAgents();
      }, 200);
    });
  },

  async loadMapAndAgents() {
    try {
      const turtleContent = await this.fetchAgentDataFromRepo();
      const agents = turtleContent.agents;
      const scenarioMap = turtleContent.map;
      const map = scenarioMap
        ? await this.getMap(scenarioMap)
        : await this.getDefaultMap();

      this.carjanState.setMapData(map);
      this.carjanState.setAgentData(agents);
    } catch (error) {
      console.error("Fehler beim Laden der Map und Agents:", error);
    }
  },

  async updateCarjanRepo(statements) {
    this.checkRepository().then(() => {
      this.deleteStatements().then(() => {
        this.updateWithStatements(statements);
      });
    });
  },

  async updateWithStatements(statements) {
    const scenarioName = statements.scenarioName;

    const entities = Object.entries(statements.entities).map(
      ([entity, { x, y, type }]) => {
        return { entity, spawn: { x, y }, type };
      }
    );

    const map = statements.scenarioMap;
    this.addRDFStatements(scenarioName, entities, map);
    this.updateRepo().then(() => {
      rdfGraph.set(rdf.dataset());
      return;
    });
  },

  async parseTurtle(turtleContent) {
    try {
      const turtleStream = stringToStream(turtleContent);
      const parser = new N3Parser();
      const quads = await rdf.dataset().import(parser.import(turtleStream));

      let scenarioName = "";
      let scenarioMap = "map01";
      const entities = {};

      quads.forEach((quad) => {
        if (
          quad.predicate.value.includes("type") &&
          quad.object.value.includes("Scenario")
        ) {
          scenarioName = quad.subject.value;
        }

        if (
          quad.predicate.value.includes("type") &&
          (quad.object.value.includes("Pedestrian") ||
            quad.object.value.includes("Vehicle") ||
            quad.object.value.includes("AutonomousVehicle"))
        ) {
          const entityType = quad.object.value.split("#")[1];
          const entity = quad.subject.value;

          if (!entities[entity]) {
            entities[entity] = { type: entityType, x: undefined, y: undefined };
          }
        }

        if (quad.predicate.value.includes("spawnPointX")) {
          entities[quad.subject.value].x = quad.object.value;
        }

        if (quad.predicate.value.includes("spawnPointY")) {
          entities[quad.subject.value].y = quad.object.value;
        }

        if (quad.predicate.value.includes("hasMap")) {
          scenarioMap = quad.object.value.split("#")[1];
        }
      });

      return { scenarioName, entities, scenarioMap };
    } catch (error) {
      console.error("Error parsing Turtle file:", error);
    }
  },

  async addRDFStatements(scenarioName, entities, map) {
    const scenarioURI = rdf.namedNode(scenarioName);

    rdfGraph.add(
      rdf.quad(
        scenarioURI,
        rdf.namedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#type"),
        rdf.namedNode("http://example.com/carla-scenario#Scenario")
      )
    );

    entities.forEach(({ entity, spawn, type }) => {
      const entityURI = rdf.namedNode(entity);

      rdfGraph.add(
        rdf.quad(
          entityURI,
          rdf.namedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#type"),
          rdf.namedNode(`http://example.com/carla-scenario#${type}`)
        )
      );

      rdfGraph.add(
        rdf.quad(
          entityURI,
          rdf.namedNode("http://example.com/carla-scenario#spawnPointX"),
          rdf.literal(
            spawn.x,
            rdf.namedNode("http://www.w3.org/2001/XMLSchema#integer")
          )
        )
      );

      rdfGraph.add(
        rdf.quad(
          entityURI,
          rdf.namedNode("http://example.com/carla-scenario#spawnPointY"),
          rdf.literal(
            spawn.y,
            rdf.namedNode("http://www.w3.org/2001/XMLSchema#integer")
          )
        )
      );
    });

    rdfGraph.add(
      rdf.quad(
        scenarioURI,
        rdf.namedNode("http://example.com/carla-scenario#hasMap"),
        rdf.namedNode(`http://example.com/carla-scenario#${map}`)
      )
    );
  },

  async updateRepo() {
    const repo =
      (localStorage.currentStore ||
        "http://localhost:8090/rdf4j/repositories/") + "carjan";
    const ajax = this.ajax;

    const onEnd = (error) => {
      if (error) {
        console.error("Error adding RDF data to repository:", error);
        return;
      }
    };

    try {
      actions.saveAgentGraph(ajax, repo, self.dataBus, onEnd);
    } catch (error) {
      console.error("Error updating repository:", error);
    }
  },

  saveEditorToRepo() {
    const gridContainer = document.querySelector("#gridContainer");
    if (!gridContainer) {
      console.error("GridContainer not found");
      return;
    }

    const scenarioURI = rdf.namedNode(
      "http://example.com/carla-scenario#CurrentScenario"
    );

    rdfGraph.add(
      rdf.quad(
        scenarioURI,
        rdf.namedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#type"),
        rdf.namedNode("http://example.com/carla-scenario#Scenario")
      )
    );

    const cells = gridContainer.querySelectorAll(".grid-cell");
    let entityCount = 1;

    cells.forEach((cell) => {
      const row = cell.dataset.row;
      const col = cell.dataset.col;

      const isOccupied = cell.getAttribute("data-occupied") === "true";
      const entityType = cell.getAttribute("data-entity-type");

      if (isOccupied) {
        const paddedEntityNumber = String(entityCount).padStart(4, "0"); // Vierstellige Nummer
        let entityURI;

        // Basierend auf dem Typ die Entitäts-URI erstellen
        if (entityType === "pedestrian") {
          entityURI = rdf.namedNode(
            `http://example.com/carla-scenario#Pedestrian${paddedEntityNumber}`
          );
        } else if (entityType === "vehicle") {
          entityURI = rdf.namedNode(
            `http://example.com/carla-scenario#Vehicle${paddedEntityNumber}`
          );
        } else if (entityType === "autonomous") {
          entityURI = rdf.namedNode(
            `http://example.com/carla-scenario#AutonomousVehicle${paddedEntityNumber}`
          );
        } else {
          entityURI = rdf.namedNode(
            `http://example.com/carla-scenario#Entity${paddedEntityNumber}`
          ); // Generischer Fall
        }

        // Entity zum Scenario hinzufügen
        rdfGraph.add(
          rdf.quad(
            scenarioURI,
            rdf.namedNode("http://example.com/carla-scenario#hasEntity"),
            entityURI
          )
        );

        // Typ der Entität festlegen
        let entityTypeURI;
        if (entityType === "pedestrian") {
          entityTypeURI = rdf.namedNode(
            "http://example.com/carla-scenario#Pedestrian"
          );
        } else if (entityType === "vehicle") {
          entityTypeURI = rdf.namedNode(
            "http://example.com/carla-scenario#Vehicle"
          );
        } else if (entityType === "autonomous") {
          entityTypeURI = rdf.namedNode(
            "http://example.com/carla-scenario#AutonomousVehicle"
          );
        }

        if (entityTypeURI) {
          rdfGraph.add(
            rdf.quad(
              entityURI,
              rdf.namedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#type"),
              entityTypeURI
            )
          );
        }

        // SpawnPointX hinzufügen
        rdfGraph.add(
          rdf.quad(
            entityURI,
            rdf.namedNode("http://example.com/carla-scenario#spawnPointX"),
            rdf.literal(
              col,
              rdf.namedNode("http://www.w3.org/2001/XMLSchema#integer")
            )
          )
        );

        // SpawnPointY hinzufügen
        rdfGraph.add(
          rdf.quad(
            entityURI,
            rdf.namedNode("http://example.com/carla-scenario#spawnPointY"),
            rdf.literal(
              row,
              rdf.namedNode("http://www.w3.org/2001/XMLSchema#integer")
            )
          )
        );

        entityCount++; // Zähler für die nächste Entität erhöhen
      }
    });

    this.updateRepo();
  },

  async fetchAgentDataFromRepo() {
    const repoURL =
      "http://localhost:8090/rdf4j/repositories/carjan/statements";
    const headers = {
      Accept: "application/ld+json; charset=utf-8",
    };

    try {
      const response = await fetch(repoURL, { headers });

      if (!response.ok) {
        throw new Error(`Failed to fetch data: ${response.statusText}`);
      }

      const data = await response.json();

      const result = { agents: this.extractAgentsData(data) };
      result.map = this.extractMapData(data);

      return result;
    } catch (error) {
      console.error("Error fetching agent data from Triplestore:", error);
    }
  },

  extractMapData(data) {
    let mapName = null;

    data.forEach((item) => {
      const id = item["@id"];

      if (
        item["@type"] &&
        item["@type"].some(
          (type) => type === "http://example.com/carla-scenario#Scenario"
        )
      ) {
        if (item["http://example.com/carla-scenario#hasMap"]) {
          mapName =
            item["http://example.com/carla-scenario#hasMap"][0]["@id"].split(
              "#"
            )[1];
        }
      }
    });

    return mapName;
  },

  extractAgentsData(data) {
    const agents = [];

    data.forEach((item) => {
      const id = item["@id"];

      if (
        item["@type"] &&
        item["@type"].some(
          (type) =>
            type === "http://example.com/carla-scenario#Entity" ||
            type === "http://example.com/carla-scenario#Pedestrian" ||
            type === "http://example.com/carla-scenario#Vehicle" ||
            type === "http://example.com/carla-scenario#AutonomousVehicle"
        )
      ) {
        const x =
          item["http://example.com/carla-scenario#spawnPointX"] &&
          item["http://example.com/carla-scenario#spawnPointX"][0]
            ? item["http://example.com/carla-scenario#spawnPointX"][0]["@value"]
            : null;

        const y =
          item["http://example.com/carla-scenario#spawnPointY"] &&
          item["http://example.com/carla-scenario#spawnPointY"][0]
            ? item["http://example.com/carla-scenario#spawnPointY"][0]["@value"]
            : null;

        let entityType = "unknown";
        if (
          item["@type"].some(
            (type) => type === "http://example.com/carla-scenario#Pedestrian"
          )
        ) {
          entityType = "pedestrian";
        } else if (
          item["@type"].some(
            (type) => type === "http://example.com/carla-scenario#Vehicle"
          )
        ) {
          entityType = "vehicle";
        } else if (
          item["@type"].some(
            (type) =>
              type === "http://example.com/carla-scenario#AutonomousVehicle"
          )
        ) {
          entityType = "autonomous";
        }

        if (x !== null && y !== null) {
          agents.push({
            entity: id,
            x: parseInt(x, 10),
            y: parseInt(y, 10),
            type: entityType,
          });
        }
      }
    });

    return agents;
  },

  async deleteRepository() {
    try {
      const response = await fetch(
        "http://localhost:4204/api/delete-carjan-repo",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
    } catch (error) {
      console.error("Error deleting CARJAN repository:", error);
    }
  },

  async deleteStatements() {
    try {
      const response = await fetch(
        "http://localhost:4204/api/delete-statements",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
    } catch (error) {
      console.error("Error deleting CARJAN repository:", error);
    }
  },

  async checkRepository() {
    try {
      const response = await fetch(
        "http://localhost:4204/api/check-repository",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const result = await response.json();
      if (!result.message) {
        this.initializeCarjanRepo();
      }
    } catch (error) {
      console.error("Repository is not available. Initializing repository...");
      await this.initializeCarjanRepo();
    }
  },

  async initializeCarjanRepo() {
    try {
      const response = await this.get("ajax").post(
        "http://localhost:4204/api/init-carjan-repo",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    } catch (error) {
      console.error("Error initializing CARJAN repository:", error);
    }
  },
});
