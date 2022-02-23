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
import {RDF, RDFS, SPIN, AGENTS, ACTN} from "ajan-editor/helpers/RDFServices/vocabulary";
import rdfGraph from "ajan-editor/helpers/RDFServices/RDF-graph";
import rdfFact from "ajan-editor/helpers/RDFServices/RDF-factory";
import rdfManager from "ajan-editor/helpers/RDFServices/RDF-manager";

export default {
  createGoal: createGoal,
  createVariables: createVariables,
  createVariable: createVariable,
  appendVariable: appendVariable,
};

function createGoal(definition) {
	rdfGraph.add(rdfFact.quad(definition.uri, RDF.type, AGENTS.Goal));
  rdfGraph.add(rdfFact.quadLiteral(definition.uri, RDFS.label, definition.label));
  createVariables(definition.uri, definition.variables);

  let consumes = rdfFact.blankNode();
  definition.consumes.url = consumes;
  rdfGraph.add(rdfFact.quad(definition.uri, ACTN.consumes, consumes));
  rdfGraph.add(rdfFact.quad(consumes, RDF.type, ACTN.Consumable));
  rdfGraph.add(rdfFact.quadLiteral(consumes, ACTN.sparql, definition.consumes.sparql));

  let produces = rdfFact.blankNode();
  definition.produces.url = produces;
  rdfGraph.add(rdfFact.quad(definition.uri, ACTN.produces, produces));
  rdfGraph.add(rdfFact.quad(produces, RDF.type, ACTN.Producible));
  rdfGraph.add(rdfFact.quadLiteral(produces, ACTN.sparql, definition.produces.sparql));
}

function createVariables(rootUri, definition) {
  let root = rdfFact.blankNode();
  rdfGraph.add(rdfFact.quad(rootUri, AGENTS.variables, root));
  definition.forEach(function (item, index, arr) {
    let first = rdfFact.blankNode();
    rdfGraph.add(rdfFact.quad(root, RDF.first, first));
    createVariable(first, item);
    item.pointerUri = root.value;
    item.uri = first.value;
    if (index < arr.length) {
      let rest = rdfFact.blankNode();
      rdfGraph.add(rdfFact.quad(root, RDF.rest, rest));
      root = rest;
    } else {
      rdfGraph.add(rdfFact.quad(root, RDF.rest, RDF.nil));
    }
  });
}

function createVariable(root, definition) {
  rdfGraph.add(rdfFact.quad(root, RDF.type, AGENTS.Variable));
  rdfGraph.add(rdfFact.quadLiteral(root, SPIN.varName, definition.varName));
  rdfGraph.add(rdfFact.quad(root, AGENTS.dataType, definition.dataType));
}

function appendVariable(root, variable, list) {
  console.log(list);
  var last_element = list[list.length - 1];
  variable.pointerUri = rdfManager.listInsert(root, last_element.pointerUri);
}



