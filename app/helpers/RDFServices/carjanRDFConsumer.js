import { RDF, RDFS, CARJAN } from "ajan-editor/helpers/RDFServices/vocabulary";
import JsonLdParser from "npm:rdf-parser-jsonld";
import rdf from "npm:rdf-ext";
import stringToStream from "npm:string-to-stream";

let parser = new JsonLdParser();

export default {
  getScenarioGraph: getScenarioGraph,
};

// Lese den RDF-Graphen und hole alle Szenarien
function getScenarioGraph(data) {
  const quadStream = parser.import(stringToStream(JSON.stringify(data)));
  let obj = rdf
    .dataset()
    .import(quadStream)
    .then(function (dataset) {
      let scenarios = [];
      getScenarios(dataset, scenarios);
      return [scenarios, dataset];
    });
  return Promise.resolve(obj);
}

// Extrahiere alle Szenarien und deren Details (Entities und Spawnpoints)
function getScenarios(graph, scenarios) {
  graph.forEach((quad) => {
    if (
      quad.predicate.value === RDF.type &&
      quad.object.value === CARJAN.Scenario
    ) {
      scenarios.push(getScenarioDefinitions(graph, quad.subject));
    }
  });
}

// Extrahiere die Details eines Szenarios, inklusive der Entities und Spawnpoints
function getScenarioDefinitions(graph, resource) {
  let scenario = { entities: [] };
  scenario.uri = resource.value;

  graph.forEach((quad) => {
    if (quad.subject.equals(resource)) {
      if (quad.predicate.value === RDFS.label) {
        scenario.label = quad.object.value;
      }
      if (quad.predicate.value === CARJAN.hasEntity) {
        let entity = getEntityDefinitions(graph, quad.object);
        scenario.entities.push(entity);
      }
    }
  });
  return scenario;
}

// Extrahiere die Details einer Entity und deren Spawnpoints
function getEntityDefinitions(graph, resource) {
  let entity = {};
  entity.uri = resource.value;
  entity.spawnPoint = {};

  graph.forEach((quad) => {
    if (quad.subject.equals(resource)) {
      if (quad.predicate.value === CARJAN.spawnPoint) {
        entity.spawnPoint = getSpawnPoint(graph, quad.object);
      }
    }
  });
  return entity;
}

// Extrahiere die Koordinaten eines Spawnpoints (x, y)
function getSpawnPoint(graph, resource) {
  let spawnPoint = {};

  graph.forEach((quad) => {
    if (quad.subject.equals(resource)) {
      if (quad.predicate.value === CARJAN.x) {
        spawnPoint.x = quad.object.value;
      }
      if (quad.predicate.value === CARJAN.y) {
        spawnPoint.y = quad.object.value;
      }
    }
  });

  return spawnPoint;
}
