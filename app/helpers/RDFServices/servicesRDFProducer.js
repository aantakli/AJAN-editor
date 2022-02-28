/*
 * Created on Tue Nov 10 2020
 *
 * The MIT License (MIT)
 * Copyright (c) 2020 André Antakli (German Research Center for Artificial Intelligence, DFKI).
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
import {ACTN, SPIN, RDF, RDFS, HTTP, XSD} from "ajan-editor/helpers/RDFServices/vocabulary";
import rdfGraph from "ajan-editor/helpers/RDFServices/RDF-graph";
import rdfManager from "ajan-editor/helpers/RDFServices/RDF-manager";
import rdfFact from "ajan-editor/helpers/RDFServices/RDF-factory";

export default {
  createService: createService,
  createVariables: createVariables,
  appendVariable: appendVariable,
  createVariable: createVariable,
	createBinding: createBinding,
  createPayload: createPayload
};

function createService(definition) {
	rdfGraph.add(rdfFact.quad(definition.uri, RDF.type, ACTN.ServiceAction));
  if (definition.communication == "Synchronous") {
    rdfGraph.add(rdfFact.quad(definition.uri, ACTN.communication, ACTN.Synchronous));
  } else {
    rdfGraph.add(rdfFact.quad(definition.uri, ACTN.communication, ACTN.Asynchronous));
  }
	rdfGraph.add(rdfFact.quadLiteral(definition.uri, RDFS.label, definition.label, XSD.string));
  createBinding("run", definition.uri, definition.run);
  if(definition.abort != null)
    createBinding("abort", definition.uri, definition.abort);
  createVariables(definition.uri, definition.variables);
  rdfGraph.add(rdfFact.quad(definition.uri, ACTN.consumes, definition.consumes.uri));
  rdfGraph.add(rdfFact.quad(definition.consumes.uri, RDF.type, ACTN.Consumable));
  rdfGraph.add(rdfFact.quadLiteral(definition.consumes.uri, ACTN.sparql, definition.consumes.sparql, XSD.string));
  rdfGraph.add(rdfFact.quad(definition.uri, ACTN.produces, definition.produces.uri));
  rdfGraph.add(rdfFact.quad(definition.produces.uri, RDF.type, ACTN.Producible));
  rdfGraph.add(rdfFact.quadLiteral(definition.produces.uri, ACTN.sparql, definition.produces.sparql, XSD.string));
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

function appendVariable(varRoot, root, variable, list) {
  if (list.length == 0) {
    let start = getEmptyList(varRoot, variable.uri);
    variable.pointerUri = start;
  } else {
    var last_element = list[list.length - 1];
    variable.pointerUri = rdfManager.listInsert(root, last_element.pointerUri);
  }
}

function getEmptyList(root, uri) {
  let start = rdfGraph.getObject(root, ACTN.variables);
  if (!start) {
    start = rdfFact.blankNode();
    rdfGraph.add(rdfFact.quad(root, ACTN.variables, start));
  } else if (start.value == RDF.nil) {
    let quad = rdfGraph.findQuad(root, ACTN.variables, start.value);
    rdfGraph.remove(quad);
    start = rdfFact.blankNode();
    rdfGraph.add(rdfFact.quad(root, ACTN.variables, start));
  }
  rdfGraph.add(rdfFact.quad(start, RDF.first, uri));
  rdfGraph.add(rdfFact.quad(start, RDF.rest, RDF.nil));
  return start.value;
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
	rdfGraph.add(rdfFact.quad(definition.uri, HTTP.mthd, definition.mthd));
  rdfGraph.add(rdfFact.quad(definition.uri, HTTP.uri, definition.requestUri));
  createHeaders(definition.uri, definition);
  rdfGraph.add(rdfFact.quadLiteral(definition.uri, ACTN.headers, "", XSD.string));
  if(definition.payload != null)
    createPayload(definition.uri, definition.payload);
}

function createHeaders(rootUri, definition) {
  console.log(definition);
  let root = rdfFact.blankNode();
  rdfGraph.add(rdfFact.quad(rootUri, HTTP.headers, root));
  let first = rdfFact.blankNode();
  definition.accept.uri = first;
  definition.accept.pointerUri = root;
  rdfGraph.add(rdfFact.quad(root, RDF.first, first));
  createHeader(first, definition.accept.value, HTTP.accept);
  let rest = rdfFact.blankNode();
  rdfGraph.add(rdfFact.quad(root, RDF.rest, rest));
  let second = rdfFact.blankNode();
  definition.contentType.uri = second;
  definition.contentType.pointerUri = rest;
  rdfGraph.add(rdfFact.quad(rest, RDF.first, second));
  createHeader(second, definition.contentType.value, HTTP.contentType);
  rdfGraph.add(rdfFact.quad(rest, RDF.rest, RDF.nil));
}

function createHeader(root, value, uri) {
  rdfGraph.add(rdfFact.quad(root, RDF.type, HTTP.Header));
  rdfGraph.add(rdfFact.quad(root, HTTP.hdrName, uri));
  rdfGraph.add(rdfFact.quadLiteral(root, HTTP.fieldValue, value, XSD.string));
}

function createPayload(rootUri, definition) {
	rdfGraph.add(rdfFact.quad(rootUri, HTTP.body, definition.uri));
	rdfGraph.add(rdfFact.quad(definition.uri, RDF.type, ACTN.Payload));
	rdfGraph.add(rdfFact.quadLiteral(definition.uri, ACTN.sparql, definition.sparql, XSD.string));
}
