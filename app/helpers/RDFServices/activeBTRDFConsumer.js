/*
 * Created on Tue Nov 10 2020
 *
 * The MIT License (MIT)
 * Copyright (c) 2020 André Antakli, Alex Grethen (German Research Center for Artificial Intelligence, DFKI).
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
import {BT, RDF, RDFS} from "ajan-editor/helpers/RDFServices/vocabulary";
import rdf from "npm:rdf-ext";
import N3Parser from "npm:rdf-parser-n3";
import stringToStream from "npm:string-to-stream";

let parser = new N3Parser();

export default {
  getActiveBTGraph: getActiveBTGraph
};

function getActiveBTGraph(data) {
  const quadStream = parser.import(stringToStream(data));
	let obj = rdf
		.dataset()
		.import(quadStream)
    .then(function (dataset) {
      let states = new Array();
      getStates(dataset, states);
      return states;
		});
	return Promise.resolve(obj);
}

function getStates(graph, states) {
	Promise.resolve(graph).then(function(graph) {
		graph.forEach(quad => {
			if (
        quad.predicate.value === RDFS.isDefinedBy
      ) {
        let state = { uri: quad.subject.value, defined: quad.object.value };
        states.push(getNodeState(graph, state));
			}
		});
	});
}

function getNodeState(graph, state) {
	graph.forEach(function(quad) {
    if (quad.subject.value === state.uri) {
      if (quad.predicate.value === RDF.type) {
        state.type = quad.object.value;
			} else if (quad.predicate.value === BT.state) {
				state.state = quad.object.value;
			}
		}
	});
	return state;
}
