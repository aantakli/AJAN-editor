import { RDF, RDFS, CARJAN } from "ajan-editor/helpers/RDFServices/vocabulary";
import rdfGraph from "ajan-editor/helpers/RDFServices/RDF-graph";
import rdfFact from "ajan-editor/helpers/RDFServices/RDF-factory";
import rdf from "npm:rdf-ext";

export default {
  createScenario: createScenario,
  createScenarioRDFString: createScenarioRDFString,
};

function createScenario(definition) {
  rdfGraph.add(rdfFact.quad(definition.uri, RDF.type, CARJAN.Scenario));
  rdfGraph.add(
    rdfFact.quadLiteral(definition.uri, RDFS.label, definition.label)
  );

  definition.entities.forEach((entity) => {
    createEntityQuads(entity);
  });
}

function createScenarioRDFString(definition) {
  let quads = rdf.dataset();
  quads.add(rdfFact.quad(definition.uri, RDF.type, CARJAN.Scenario));
  quads.add(rdfFact.quadLiteral(definition.uri, RDFS.label, definition.label));

  definition.entities.forEach((entity) => {
    addEntityQuads(quads, entity);
  });

  return rdfGraph.toString(quads);
}

function createEntityQuads(entity) {
  rdfGraph.add(rdfFact.quad(entity.uri, RDF.type, CARJAN.Entity));
  rdfGraph.add(
    rdfFact.quad(entity.uri, CARJAN.spawnPoint, entity.spawnPointUri)
  );
  rdfGraph.add(
    rdfFact.quadLiteral(entity.spawnPointUri, CARJAN.x, entity.spawnPoint.x)
  );
  rdfGraph.add(
    rdfFact.quadLiteral(entity.spawnPointUri, CARJAN.y, entity.spawnPoint.y)
  );
}

function addEntityQuads(quads, entity) {
  quads.add(rdfFact.quad(entity.uri, RDF.type, CARJAN.Entity));
  quads.add(rdfFact.quad(entity.uri, CARJAN.spawnPoint, entity.spawnPointUri));
  quads.add(
    rdfFact.quadLiteral(entity.spawnPointUri, CARJAN.x, entity.spawnPoint.x)
  );
  quads.add(
    rdfFact.quadLiteral(entity.spawnPointUri, CARJAN.y, entity.spawnPoint.y)
  );
}
