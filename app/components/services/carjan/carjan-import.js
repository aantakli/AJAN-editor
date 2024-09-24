import Component from "@ember/component";
import rdf from "npm:rdf-ext"; // Verwende rdf-ext für die RDF-Operationen
import N3Parser from "npm:rdf-parser-n3";
import stringToStream from "npm:string-to-stream";
import rdfGraph from "ajan-editor/helpers/RDFServices/RDF-graph";
import actions from "ajan-editor/helpers/agents/actions";
import { CARJAN } from "ajan-editor/helpers/RDFServices/vocabulary";
import globals from "ajan-editor/helpers/global-parameters";

let self;

export default Component.extend({
  dataBus: Ember.inject.service("data-bus"),
  ajax: Ember.inject.service(),

  init() {
    this._super(...arguments);
    self = this;
    rdfGraph.set(rdf.dataset());
  },

  actions: {
    uploadFile() {
      document.getElementById("fileInput").click();
    },

    async saveAndReset() {
      // Zeige Toast an
      $("#toast").fadeIn();

      // 1 Sekunde warten
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // RDF Daten speichern (kann an deine Logik angepasst werden)
      this.saveScenarioToRepo();

      // Toast ausblenden
      $("#toast").fadeOut();

      // Szenario aus dem Triplestore farblich darstellen
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
          this.parseTurtle(turtleContent);
        };

        reader.readAsText(file);
      }
    },
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

        if (quad.predicate.value.includes("hasEntity")) {
          const entity = quad.object.value;
          entities[entity] = { x: undefined, y: undefined };
        }

        if (quad.predicate.value.includes("spawnPointX")) {
          entities[quad.subject.value].x = quad.object.value;
        }

        if (quad.predicate.value.includes("spawnPointY")) {
          entities[quad.subject.value].y = quad.object.value;
        }
      });

      console.log("Szenario Name:", scenarioName);
      console.log("Entities:", Object.keys(entities));

      Object.entries(entities).forEach(([entity, spawn]) => {
        console.log(
          `Entity: ${entity}, Spawnpoint: [x: ${spawn.x}, y: ${spawn.y}]`
        );
      });

      // Nachdem das Turtle-File geparst wurde, speichere es ins RDF4J-Repository
      this.addRDFStatements(scenarioName, entities);
    } catch (error) {
      console.error("Error parsing Turtle file:", error);
    }
  },

  async addRDFStatements(scenarioName, entities) {
    const scenarioURI = rdf.namedNode(
      `http://example.com/carla-scenario#${scenarioName.split("#")[1]}`
    );

    rdfGraph.add(
      rdf.quad(
        scenarioURI,
        rdf.namedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#type"),
        rdf.namedNode("http://example.com/carla-scenario#Scenario")
      )
    );

    Object.entries(entities).forEach(([entity, spawn]) => {
      const entityURI = rdf.namedNode(
        `http://example.com/carla-scenario#${entity.split("#")[1]}`
      );

      rdfGraph.add(
        rdf.quad(
          entityURI,
          rdf.namedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#type"),
          rdf.namedNode("http://example.com/carla-scenario#Entity")
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

    // Aktualisiere das Repository
    this.updateRepo();
  },
  async updateRepo() {
    const repo =
      (localStorage.currentStore ||
        "http://localhost:8090/rdf4j/repositories/") + "carjan";
    const ajax = this.ajax;

    // Definiere eine Callback-Funktion für das Ende des Prozesses
    const onEnd = (error) => {
      if (error) {
        console.error("Error adding RDF data to repository:", error);
      } else {
        console.log('RDF data successfully added to repository "carjan".');
      }
    };

    try {
      actions.saveAgentGraph(ajax, repo, self.dataBus, onEnd); // Nutze die onEnd-Callback-Funktion
    } catch (error) {
      console.error("Error updating repository:", error);
    }
  },

  saveScenarioToRepo() {
    console.log("TODO: Save scenario to repository");
  },

  async colorScenarioFromRepo() {
    try {
      const response = await fetch("/assets/carjan-maps/maps.json");
      const maps = await response.json();

      const map = maps.map01;

      const canvas = document.querySelector("#gridCanvas");
      if (!canvas) {
        throw new Error("Canvas element not found.");
      }
      const ctx = canvas.getContext("2d");
      const cellSize = 50;

      const rootStyles = getComputedStyle(document.documentElement);
      const colors = {
        r: rootStyles.getPropertyValue("--color-primary").trim(),
        p: rootStyles.getPropertyValue("--color-primary-2").trim(),
      };

      map.forEach((row, rowIndex) => {
        row.forEach((cell, colIndex) => {
          ctx.fillStyle = colors[cell];
          ctx.fillRect(
            colIndex * cellSize,
            rowIndex * cellSize,
            cellSize,
            cellSize
          );
          ctx.strokeRect(
            colIndex * cellSize,
            rowIndex * cellSize,
            cellSize,
            cellSize
          );
        });
      });

      const agents = await this.fetchAgentDataFromRepo();
      this.colorAgents(agents, ctx, cellSize);

      console.log(
        "Map and agents loaded and drawn from maps.json and Triplestore."
      );
    } catch (error) {
      console.error("Error loading or drawing the map:", error);
    }
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

      const agents = this.extractAgentsData(data);
      console.log("Extracted Agents Data:", agents);
      return agents;
    } catch (error) {
      console.error("Error fetching agent data from Triplestore:", error);
    }
  },

  extractAgentsData(data) {
    const agents = [];

    // Durchsuche alle Items in den JSON-LD-Daten
    data.forEach((item) => {
      const id = item["@id"];

      // Überprüfe, ob der Agententyp vorhanden ist und `Entity` enthält
      if (
        item["http://www.w3.org/1999/02/22-rdf-syntax-ns#type"] &&
        item["http://www.w3.org/1999/02/22-rdf-syntax-ns#type"].some(
          (type) => type["@id"] === "http://example.com/carla-scenario#Entity"
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

        if (x && y) {
          agents.push({
            entity: id,
            x: parseInt(x, 10),
            y: parseInt(y, 10),
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
});
