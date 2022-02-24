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
import {BT, ACTN, RDF, RDFS, HTTP, SPIN, AGENTS} from "ajan-editor/helpers/RDFServices/vocabulary";
import JsonLdParser from "npm:rdf-parser-jsonld";
import rdf from "npm:rdf-ext";
import stringToStream from "npm:string-to-stream";
import util from "ajan-editor/helpers/RDFServices/utility";

let parser = new JsonLdParser();

export default {
  getEventsGraph: getEventsGraph
};

//TODO: Replace graph parameter in methods by call to singleton
// BODY

// Use this to parse data for event
// Request the entire graph
function getEventsGraph(data) {
	const quadStream = parser.import(stringToStream(JSON.stringify(data)));

	let obj = rdf
		.dataset()
		.import(quadStream)
		.then(function(dataset) {
			// Dataset is array of quads
			let agents = new Array();
			getEvents(dataset, agents);
			return [agents, dataset];
		});
	return Promise.resolve(obj);
}

function getEvents(graph, events) {
	Promise.resolve(graph).then(function(graph) {
		graph.forEach(quad => {
			if (
				quad.predicate.value === RDF.type
        && (quad.object.value === AGENTS.Event || quad.object.value === AGENTS.QueueEvent || quad.object.value === AGENTS.MappingEvent)
			) {
        events.push(getEventsDefinitions(graph, quad.subject));
			}
		});
	});
}

function getEventsDefinitions(graph, resource) {
  console.log("get event definition");
  let event = {};
  event.id = util.generateUUID();
  event.uri = resource.value;
  event.name = "Event";
  graph.forEach(function (quad) {
    if (quad.subject.equals(resource)) {
      if (quad.predicate.value === RDFS.label) {
        event.label = quad.object.value;
      }
      if (quad.predicate.value === RDF.type) {
        event.type = quad.object.value;
			}

    }
  });
  return event;
}
