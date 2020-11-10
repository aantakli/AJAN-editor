/*
 * Created on Tue Nov 10 2020
 *
 * The MIT License (MIT)
 * Copyright (c) 2020 André Antakli, Xueting Li (German Research Center for Artificial Intelligence, DFKI).
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software
 * and associated documentation files (the "Software"), to deal in the Software without restriction,
 * including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all copies or substantial
 * portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED
 * TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL
 * THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
 * TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
import {ACTN, SPIN, RDF, RDFS, HTTP, XSD, AGENTS} from "ajan-editor/helpers/RDFServices/vocabulary";
import rdfGraph from "ajan-editor/helpers/RDFServices/RDF-graph";
import rdfManager from "ajan-editor/helpers/RDFServices/RDF-manager";
import rdfFact from "ajan-editor/helpers/RDFServices/RDF-factory";

export default {
  createAgent: createAgent
};
// editing ajan

function createAgent(definition) {
	rdfGraph.add(rdfFact.quad(definition.uri, RDF.type,AGENTS.AgentTemplate ));
  rdfGraph.add(rdfFact.quadLiteral(definition.uri, RDFS.label, definition.label));

}

function createVariables(rootUri, definition) {
  let root = rdfFact.blankNode();
  rdfGraph.add(rdfFact.quad(rootUri, ACTN.variables, root));
  definition.forEach(function(item, index, arr) {
    let first = rdfFact.blankNode();
    rdfGraph.add(rdfFact.quad(root, RDF.first, first));
    createVariable(first, item);
    item.pointerUri = first.value;
    if (index < arr.length) {
      let rest = rdfFact.blankNode();
      rdfGraph.add(rdfFact.quad(root, RDF.rest, rest));
      root = rest;
    } else {
      rdfGraph.add(rdfFact.quad(root, RDF.rest, RDF.nil));
    }
  });
}

function appendVariable(root, variable, list) {
  var last_element = list[list.length-1];
	variable.pointerUri = rdfManager.listInsert(root,last_element.pointerUri);
}

function createVariable(root, definition) {
  rdfGraph.add(rdfFact.quad(root, RDF.type, ACTN.ActionVariable));
  rdfGraph.add(rdfFact.quadLiteral(root, SPIN.varName, definition.var, XSD.string));
}

function createBinding(type, rootUri, definition) {
  if (type === "abort") {
    rdfGraph.add(rdfFact.quad(rootUri, ACTN.abortBinding, definition.uri));
  } else {
    rdfGraph.add(rdfFact.quad(rootUri, ACTN.runBinding, definition.uri));
  }
	rdfGraph.add(rdfFact.quad(definition.uri, RDF.type, ACTN.Binding));
	rdfGraph.add(rdfFact.quad(definition.uri, RDF.type, HTTP.Request));
	rdfGraph.add(rdfFact.quadLiteral(definition.uri, HTTP.version, definition.version, XSD.string));
	rdfGraph.add(rdfFact.quadLiteral(definition.uri, HTTP.mthd, definition.mthd, XSD.anyURI));
	rdfGraph.add(rdfFact.quadLiteral(definition.uri, HTTP.uri, definition.requestUri, XSD.anyURI));
  if(definition.payload != null)
    createPayload(definition.uri, definition.payload);
}

function createPayload(rootUri, definition) {
	rdfGraph.add(rdfFact.quad(rootUri, HTTP.body, definition.uri));
	rdfGraph.add(rdfFact.quad(definition.uri, RDF.type, ACTN.Payload));
	rdfGraph.add(rdfFact.quadLiteral(definition.uri, ACTN.sparql, definition.sparql, XSD.string));
}
