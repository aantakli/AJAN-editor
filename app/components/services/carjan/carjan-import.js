import Component from "@ember/component";
import rdf from "npm:rdf-ext";
import N3Parser from "npm:rdf-parser-n3";
import stringToStream from "npm:string-to-stream";
import rdfGraph from "ajan-editor/helpers/RDFServices/RDF-graph";
import actions from "ajan-editor/helpers/carjan/actions";
import { inject as service } from "@ember/service";
import { getOwner } from "@ember/application";

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

  async getMap() {
    const response = await fetch("/assets/carjan-maps/maps.json");
    const maps = await response.json();
    return maps.map01;
  },

  didInsertElement() {
    this.loadMapAndAgents();
  },

  actions: {
    uploadFile() {
      document.getElementById("fileInput").click();
    },

    async saveAndReset() {
      $("#toast").fadeIn();

      await new Promise((resolve) => setTimeout(resolve, 1000));

      this.saveEditorToRepo();

      $("#toast").fadeOut();

      this.colorScenarioFromRepo();
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
            this.updateCarjanRepo(result);
          });
        };

        reader.readAsText(file);
      }
    },
  },

  async loadMapAndAgents() {
    try {
      const map = await this.getMap(); // Map laden
      const agents = await this.fetchAgentDataFromRepo();

      this.carjanState.setMapData(map);
      this.carjanState.setAgentData(agents);

      console.log("Map und Agents erfolgreich geladen:", map, agents);
    } catch (error) {
      console.error("Fehler beim Laden der Map und Agents:", error);
    }
  },

  async updateCarjanRepo(statements) {
    this.checkRepository().then(() => {
      this.deleteStatements().then(() => {
        const scenarioName = statements.scenarioName;

        const entities = Object.entries(statements.entities).map(
          ([entity, { x, y, type }]) => {
            return { entity, spawn: { x, y }, type }; // Den Typ mit übergeben
          }
        );

        this.addRDFStatements(scenarioName, entities);
        this.updateRepo().then(() => {
          rdfGraph.set(rdf.dataset());
        });
        this.colorScenarioFromRepo();
      });
    });
  },

  async parseTurtle(turtleContent) {
    try {
      const turtleStream = stringToStream(turtleContent);
      const parser = new N3Parser();
      const quads = await rdf.dataset().import(parser.import(turtleStream));

      let scenarioName = "";
      const entities = {};

      quads.forEach((quad) => {
        if (
          quad.predicate.value.includes("type") &&
          quad.object.value.includes("Scenario")
        ) {
          scenarioName = quad.subject.value;
        }

        // Erfasse die Entitäten und deren Typen
        if (
          quad.predicate.value.includes("type") &&
          (quad.object.value.includes("Pedestrian") ||
            quad.object.value.includes("Vehicle") ||
            quad.object.value.includes("AutonomousVehicle"))
        ) {
          const entityType = quad.object.value.split("#")[1]; // Extrahiere den Typ
          const entity = quad.subject.value;

          // Speichere Entität und Typ
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
      });

      return { scenarioName, entities };
    } catch (error) {
      console.error("Error parsing Turtle file:", error);
    }
  },

  async addRDFStatements(scenarioName, entities) {
    const scenarioURI = rdf.namedNode(scenarioName);

    // Scenario-Statement hinzufügen
    rdfGraph.add(
      rdf.quad(
        scenarioURI,
        rdf.namedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#type"),
        rdf.namedNode("http://example.com/carla-scenario#Scenario")
      )
    );

    // Durch alle Entities iterieren und deren spezifischen Typ sowie Spawnpunkte hinzufügen
    entities.forEach(({ entity, spawn, type }) => {
      const entityURI = rdf.namedNode(entity);

      // Spezifischen Typ hinzufügen (pedestrian, vehicle, autonomousVehicle)
      rdfGraph.add(
        rdf.quad(
          entityURI,
          rdf.namedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#type"),
          rdf.namedNode(`http://example.com/carla-scenario#${type}`)
        )
      );

      // SpawnPointX hinzufügen
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

      // SpawnPointY hinzufügen
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
    console.log("Saving scenario to repository...");

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

    // Gehe durch alle Zellen im Grid
    const cells = gridContainer.querySelectorAll(".grid-cell");
    cells.forEach((cell) => {
      const row = cell.dataset.row;
      const col = cell.dataset.col;
      console.log("cell", cell);
      const isOccupied = cell.getAttribute("data-occupied") === "true";
      const entityType = cell.getAttribute("data-entity-type"); // Entity-Type aus den Datenattributen
      console.log("Entity-Type:", entityType);
      if (isOccupied) {
        const entityURI = rdf.namedNode(
          `http://example.com/carla-scenario#Entity${row}${col}`
        );

        rdfGraph.add(
          rdf.quad(
            scenarioURI,
            rdf.namedNode("http://example.com/carla-scenario#hasEntity"),
            entityURI
          )
        );

        let entityTypeURI;
        if (entityType === "pedestrian") {
          entityTypeURI = rdf.namedNode(
            "http://example.com/carla-scenario#Pedestrian"
          );
        } else if (entityType === "vehicle") {
          entityTypeURI = rdf.namedNode(
            "http://example.com/carla-scenario#Vehicle"
          );
        } else if (entityType === "autonomousVehicle") {
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

        // SpawnPointX und SpawnPointY hinzufügen
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
      }
    });

    console.log("Scenario successfully saved to RDF Graph:", rdfGraph);
    this.updateRepo();
  },
  async colorScenarioFromRepo() {
    try {
      // Fetch the map data from JSON
      const response = await fetch("/assets/carjan-maps/maps.json");
      const maps = await response.json();

      // Select the correct map (example: map01)
      const map = maps.map01;

      const gridContainer = document.querySelector("#gridContainer");
      if (!gridContainer) {
        throw new Error("GridContainer element not found.");
      }

      // Retrieve color values from CSS
      const rootStyles = getComputedStyle(document.documentElement);
      const colors = {
        r: rootStyles.getPropertyValue("--color-primary").trim(),
        p: rootStyles.getPropertyValue("--color-primary-2").trim(),
      };

      map.forEach((row, rowIndex) => {
        row.forEach((cell, colIndex) => {
          const gridCell = gridContainer.querySelector(
            `.grid-cell[data-row="${rowIndex}"][data-col="${colIndex}"]`
          );

          if (gridCell) {
            gridCell.style.backgroundColor = colors[cell]; // Verwende die richtigen Farben
          }
        });
      });

      // Fetch agents from the repository and color them on the grid
      const agents = await this.fetchAgentDataFromRepo();
      this.colorAgentsOnGrid(agents);
    } catch (error) {
      console.error("Error loading or drawing the map:", error);
    }
  },

  colorAgentsOnGrid(agents) {
    const gridContainer = document.querySelector("#gridContainer");

    // Zugriff auf die CarjanItem-Komponente

    agents.forEach((agent) => {
      const gridCell = gridContainer.querySelector(
        `.grid-cell[data-row="${agent.y}"][data-col="${agent.x}"]`
      );

      if (gridCell) {
        let agentColor;
        if (agent.type === "pedestrian") {
          agentColor = "blue";
        } else if (agent.type === "vehicle") {
          agentColor = "red";
        } else if (agent.type === "autonomousVehicle") {
          agentColor = "green";
        }

        gridCell.style.backgroundColor = agentColor;
        gridCell.setAttribute("data-occupied", "true");
        gridCell.setAttribute("data-active", "true");
        gridCell.setAttribute("draggable", "true");
        gridCell.setAttribute("data-entity-type", agent.type);
      }
    });
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

      return this.extractAgentsData(data);
    } catch (error) {
      console.error("Error fetching agent data from Triplestore:", error);
    }
  },

  extractAgentsData(data) {
    const agents = [];

    data.forEach((item) => {
      const id = item["@id"];

      // Prüfe, ob das Item eine Entität ist
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

        // Bestimme den genauen Typ
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
          entityType = "autonomousVehicle";
        }

        // Wenn x und y vorhanden sind, füge die Entität zu agents hinzu
        if (x !== null && y !== null) {
          agents.push({
            entity: id,
            x: parseInt(x, 10),
            y: parseInt(y, 10),
            type: entityType, // Typ hinzufügen
          });
        }
      }
    });

    return agents;
  },
  colorAgents(agents, ctx, cellSize) {
    const rootStyles = getComputedStyle(document.documentElement);
    const colors = {
      pedestrian: rootStyles.getPropertyValue("--color-primary-3").trim(),
      vehicle: rootStyles.getPropertyValue("--color-primary-4").trim(),
      autonomousVehicle: rootStyles
        .getPropertyValue("--color-primary-5")
        .trim(),
    };

    agents.forEach((agent) => {
      let fillColor;
      if (agent.entity.includes("Pedestrian")) {
        fillColor = colors.pedestrian;
      } else if (
        agent.entity.includes("Vehicle") &&
        !agent.entity.includes("AutonomousVehicle")
      ) {
        fillColor = colors.vehicle;
      } else if (agent.entity.includes("AutonomousVehicle")) {
        fillColor = colors.autonomousVehicle;
      }

      ctx.fillStyle = fillColor;
      ctx.fillRect(agent.x * cellSize, agent.y * cellSize, cellSize, cellSize);
      ctx.strokeRect(
        agent.x * cellSize,
        agent.y * cellSize,
        cellSize,
        cellSize
      );
    });
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
