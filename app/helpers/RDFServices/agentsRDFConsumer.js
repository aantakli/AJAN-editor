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
import {RDF, RDFS, AGENTS} from "ajan-editor/helpers/RDFServices/vocabulary";
import JsonLdParser from "npm:rdf-parser-jsonld";
import rdf from "npm:rdf-ext";
import stringToStream from "npm:string-to-stream";
import util from "ajan-editor/helpers/RDFServices/utility";

let parser = new JsonLdParser();

export default {
	getAgentsGraph: getAgentsGraph,

};

//TODO: Replace graph parameter in methods by call to singleton
// BODY

// Use this to parse data for behavior
// Request the entire graph
function getAgentsGraph(data) {
  const quadStream = parser.import(stringToStream(JSON.stringify(data)));
	let obj = rdf
		.dataset()
		.import(quadStream)
		.then(function(dataset) {
			// Dataset is array of quads
      let agents = new Array();
      console.log(dataset);
			getAgents(dataset, agents);
			return [agents, dataset];
		});
	return Promise.resolve(obj);
}

// for ?x http://www.w3.org/1999/02/22-rdf-syntax-ns#type http://www.ajan.de/behavior/bt-ns#BehaviorTree

function getAgents(graph, agents) {
	Promise.resolve(graph).then(function(graph) {
		graph.forEach(quad => {
			if (
				quad.predicate.value === RDF.type
				&& quad.object.value === AGENTS.AgentTemplate
			) {
				agents.push(getAgentsDefinitions(graph, quad.subject));
			}
		});
	});
}

// Parse the ServiceAction
function getAgentsDefinitions(graph, resource) {
  console.log("get agent definition");
  let agent = {};
  let behaviors = new Array();
  let events = new Array();
  let endpoints = new Array();
  agent.id = util.generateUUID();
  agent.uri = resource.value;
  agent.name = "Agent";
  graph.forEach(function (quad) {
    if (quad.subject.equals(resource)) {
      if (quad.predicate.value === RDFS.label) {
        agent.label = quad.object.value;
      }
      if (quad.predicate.value === RDF.type) {
				agent.type = quad.object.value;
      }
      if (quad.predicate.value === AGENTS.event) {
        agent.events = {};
        agent.events.uri = quad.object.value;
        graph.forEach(function (innerquad) {
          if (innerquad.subject.equals(quad.object)) {
            if (innerquad.predicate.value === RDFS.label) {
              agent.events.label = innerquad.object.value;
            }
          }
        });
        events.push(agent.events);
      }
      if (quad.predicate.value === AGENTS.initKnowledge) {
        agent.initKnowledge = quad.object.value;
      }
      if (quad.predicate.value === AGENTS.endpoint) {
        agent.endpoints = {};
        agent.endpoints.uri = quad.object.value;
        graph.forEach(function (innerquad){
            if (innerquad.subject.equals(quad.object)){
              if (innerquad.predicate.value === RDFS.label) {
				        agent.endpoints.label=innerquad.object.value;
              }
              if (innerquad.predicate.value === AGENTS.capability) {
                agent.endpoints.capability = innerquad.object.value;
              }
            }
          });
        endpoints.push(agent.endpoints);
      }
      if (quad.predicate.value === AGENTS.behavior) {
        agent.behaviors = {};
        agent.behaviors.uri=quad.object.value;
        graph.forEach(function (innerquad){
          if (innerquad.subject.equals(quad.object)){
            if (innerquad.predicate.value === RDFS.label) {
				        agent.behaviors.label=innerquad.object.value;
			        }
          }
          });
        behaviors.push(agent.behaviors);
      }
      if (quad.predicate.value === AGENTS.initialBehavior) {
        agent.initialBehavior = {};
        agent.initialBehavior.uri = quad.object.value;
        graph.forEach(function (innerquad) {
          if (innerquad.subject.equals(quad.object)) {
            if (innerquad.predicate.value === RDFS.label) {
              agent.initialBehavior.label = innerquad.object.value;
            }
          }
        });
      }
      if (quad.predicate.value === AGENTS.finalBehavior) {
        agent.finalBehavior = {};
        agent.finalBehavior.uri = quad.object.value;
        graph.forEach(function (innerquad) {
          if (innerquad.subject.equals(quad.object)) {
            if (innerquad.predicate.value === RDFS.label) {
              agent.finalBehavior.label = innerquad.object.value;
            }
          }
        });
      }
    }
  });
  agent.behaviors = behaviors;
  agent.events = events;
  agent.endpoints = endpoints;
  return agent;
}

