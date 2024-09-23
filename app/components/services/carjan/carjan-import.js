import Component from "@ember/component";
import rdf from "npm:rdf-ext"; // Verwende rdf-ext für die RDF-Operationen
import N3Parser from "npm:rdf-parser-n3";
import stringToStream from "npm:string-to-stream";
import rdfGraph from "ajan-editor/helpers/RDFServices/RDF-graph";
import actions from "ajan-editor/helpers/agents/actions";
import globals from "ajan-editor/helpers/global-parameters";

let self;

export default Component.extend({
  dataBus: Ember.inject.service('data-bus'),
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

    handleFile(event) {
      if (!event || !event.target || !event.target.files || event.target.files.length === 0) {
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
        if (quad.predicate.value.includes("type") && quad.object.value.includes("Scenario")) {
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
        console.log(`Entity: ${entity}, Spawnpoint: [x: ${spawn.x}, y: ${spawn.y}]`);
      });

      // Nachdem das Turtle-File geparst wurde, speichere es ins RDF4J-Repository
      this.addRDFStatements(scenarioName, entities);

    } catch (error) {
      console.error("Error parsing Turtle file:", error);
    }
  },

  async addRDFStatements(scenarioName, entities) {
    const scenarioURI = rdf.namedNode(`http://example.com/carla-scenario#${scenarioName.split('#')[1]}`);

    rdfGraph.add(rdf.quad(
      scenarioURI,
      rdf.namedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#type"),
      rdf.namedNode("http://example.com/carla-scenario#Scenario")
    ));

    Object.entries(entities).forEach(([entity, spawn]) => {
      const entityURI = rdf.namedNode(`http://example.com/carla-scenario#${entity.split('#')[1]}`);

      rdfGraph.add(rdf.quad(
        entityURI,
        rdf.namedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#type"),
        rdf.namedNode("http://example.com/carla-scenario#Entity")
      ));

      rdfGraph.add(rdf.quad(
        entityURI,
        rdf.namedNode("http://example.com/carla-scenario#spawnPointX"),
        rdf.literal(spawn.x, rdf.namedNode("http://www.w3.org/2001/XMLSchema#integer"))
      ));

      rdfGraph.add(rdf.quad(
        entityURI,
        rdf.namedNode("http://example.com/carla-scenario#spawnPointY"),
        rdf.literal(spawn.y, rdf.namedNode("http://www.w3.org/2001/XMLSchema#integer"))
      ));
    });

    // Aktualisiere das Repository
    this.updateRepo();
  },

  async updateRepo() {
    const repo = (localStorage.currentStore || "http://localhost:8090/rdf4j/repositories/") + "carjan";
    const ajax = this.ajax;

    // Definiere eine Callback-Funktion für das Ende des Prozesses
    const onEnd = (error) => {
      if (error) {
        console.error('Error adding RDF data to repository:', error);
      } else {
        console.log('RDF data successfully added to repository "carjan".');
      }
    };

    try {
      actions.saveAgentGraph(ajax, repo, self.dataBus, onEnd);  // Nutze die onEnd-Callback-Funktion
    } catch (error) {
      console.error('Error updating repository:', error);
    }
  }

});
