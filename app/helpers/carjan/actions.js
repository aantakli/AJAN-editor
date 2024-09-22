import ajaxActions from "ajan-editor/helpers/carjan/actions/ajax";
import token from "ajan-editor/helpers/token";
import rdfGraph from "ajan-editor/helpers/RDFServices/RDF-graph";
import rdfManager from "ajan-editor/helpers/RDFServices/RDF-manager";
import rdfFact from "ajan-editor/helpers/RDFServices/RDF-factory";
import utility from "ajan-editor/helpers/RDFServices/utility";
import { RDF, XSD } from "ajan-editor/helpers/RDFServices/vocabulary";
import rdf from "npm:rdf-ext";
import N3 from "npm:rdf-parser-n3";
import stringToStream from "npm:string-to-stream";

import ajax from "ember-ajax";
import queries from "ajan-editor/helpers/RDFServices/queries";

export default {
  deleteEntity: deleteEntity,
  deleteAll: deleteAll,
  createDefinedEntity: createDefinedEntity,

  // AJAX-related actions
  resolveToken: token.resolveToken,
  getFromServer: ajaxActions.getFromServer,
  saveGraph: ajaxActions.saveGraph,
  //
  readTTLInput: readTTLInput,
  getTTLMatches: getTTLMatches,
  deleteMatches: deleteMatches,
};

// Deletes an entity from the RDF graph
function deleteEntity(entityUri) {
  rdfGraph.removeAllRelated(entityUri);
}

// Creates an entity based on provided data
function createDefinedEntity(repo, name, x, y) {
  let entity = {};
  entity.uri = repo + `#${name}_${utility.generateUUID()}`;
  entity.type = RDF.type;
  entity.spawnPointX = x;
  entity.spawnPointY = y;
  rdfGraph.add(
    rdfFact.quadLiteral(
      entity.uri,
      "http://example.com/carla-scenario#spawnPointX",
      x,
      XSD.integer
    )
  );
  rdfGraph.add(
    rdfFact.quadLiteral(
      entity.uri,
      "http://example.com/carla-scenario#spawnPointY",
      y,
      XSD.integer
    )
  );
  return entity;
}

// Reads a Turtle (.ttl) input file
function readTTLInput(content, onend) {
  let parser = new N3({ factory: rdf });
  let quadStream = parser.import(stringToStream(content));
  let importFile = { raw: content, quads: [], entities: [] };
  rdf
    .dataset()
    .import(quadStream)
    .then((dataset) => {
      dataset.forEach((quad) => {
        importFile.quads.push(quad);
        if (quad.predicate.value.includes("hasEntity")) {
          importFile.entities.push(quad.subject.value);
        }
      });
      onend(importFile);
    });
}

// Matches TTL data with existing RDF data
function getTTLMatches(defs, imports, matches) {
  if (!matches) matches = [];
  if (imports) {
    defs.forEach((data) => {
      imports.forEach((item) => {
        if (data.uri === item) {
          data.match = true;
          if (!matches.find((x) => x.uri === data.uri)) matches.push(data);
        }
      });
    });
  }
  return matches;
}

// Deletes matched RDF data
function deleteMatches(matches) {
  if (matches.length > 0) {
    matches.forEach((data) => {
      if (data.match) deleteEntity(data.uri);
    });
  }
}

// Löscht alle Statements aus dem Repository
function deleteAll() {
  console.log("Deleting all statements from the repository");
  return queries.deleteAll();
}
