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
  getEndpointsGraph: getEndpointsGraph
};

//TODO: Replace graph parameter in methods by call to singleton
// BODY

// Use this to parse data for Endpoint
// Request the entire graph
function getEndpointsGraph(data) {
	const quadStream = parser.import(stringToStream(JSON.stringify(data)));

	let obj = rdf
		.dataset()
		.import(quadStream)
		.then(function(dataset) {
			// Dataset is array of quads
			let agents = new Array();
			getEndpoints(dataset, agents);
			return [agents, dataset];
		});
	return Promise.resolve(obj);
}



// for ?x http://www.w3.org/1999/02/22-rdf-syntax-ns#type http://www.ajan.de/Endpoint/bt-ns#EndpointTree



function getEndpoints(graph, agents) {
	Promise.resolve(graph).then(function(graph) {
		graph.forEach(quad => {
			if (
				quad.predicate.value === RDF.type
				&& quad.object.value === AGENTS.Endpoint
			) {
				agents.push(getEndpointsDefinitions(graph, quad.subject));
			}
		});
	});
}



// Parse the ServiceAction


function getEndpointsDefinitions(graph, resource) {
    console.log("get endpoint definition");
  let agents = {};
  let events = new Array();
  agents.id = util.generateUUID();
  agents.uri = resource.value;
  agents.name = "Endpoint";
  graph.forEach(function (quad) {
    if (quad.subject.equals(resource)) {

      if (quad.predicate.value === RDFS.label) {
        agents.label = quad.object.value;
      }
      if (quad.predicate.value === RDF.type) {
				agents.type = quad.object.value;
			}

       if (quad.predicate.value === AGENTS.event) {
         agents.events={};
         agents.events.uri=quad.object.value;
         graph.forEach(function (innerquad){
           if (innerquad.subject.equals(quad.object)){
             if (innerquad.predicate.value === RDFS.label) {
				         agents.events.label=innerquad.object.value;
			          }
           }
           });
         events.push(agents.events);
      }
       if (quad.predicate.value ===AGENTS.capability) {
          agents.capability = quad.object.value;
      }


    }
  });
  agents.events = events;
  return agents;
}
