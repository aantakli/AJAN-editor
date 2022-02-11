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
  createInitialBehavior: createInitialBehavior,
  createFinalBehavior: createFinalBehavior,
  createBehavior: createBehavior
};
// editing ajan


function createInitialBehavior(definition) {
	rdfGraph.add(rdfFact.quad(definition.uri, RDF.type, AGENTS.InitialBehavior));
  rdfGraph.add(rdfFact.quadLiteral(definition.uri, RDFS.label, definition.label));
}

function createFinalBehavior(definition) {
  rdfGraph.add(rdfFact.quad(definition.uri, RDF.type, AGENTS.FinalBehavior));
  rdfGraph.add(rdfFact.quadLiteral(definition.uri, RDFS.label, definition.label));
}

function createBehavior(definition) {
  console.log(definition);
  rdfGraph.add(rdfFact.quad(definition.uri, RDF.type, AGENTS.Behavior));
  rdfGraph.add(rdfFact.quadLiteral(definition.uri, RDFS.label, definition.label));
  rdfGraph.add(rdfFact.quadLiteral(definition.uri, AGENTS.clearEKB, definition.clearEKB, XSD.boolean));
}

