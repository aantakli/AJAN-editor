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
import {BT, ACTN, RDF, RDFS, HTTP, SPIN} from "ajan-editor/helpers/RDFServices/vocabulary";
import JsonLdParser from "npm:rdf-parser-jsonld";
import rdf from "npm:rdf-ext";
import stringToStream from "npm:string-to-stream";
import util from "ajan-editor/helpers/RDFServices/utility";

let parser = new JsonLdParser();

export default {
	getActionsGraph: getActionsGraph
};

//TODO: Replace graph parameter in methods by call to singleton
// BODY

// Use this to parse data for behavior
// Request the entire graph
function getActionsGraph(data, ttl) {
  let quadStream = data;
  if (!ttl)
    quadStream = parser.import(stringToStream(JSON.stringify(data)));
	let obj = rdf
		.dataset()
		.import(quadStream)
		.then(function(dataset) {
			// Dataset is array of quads
			let actions = {};
			actions.services = new Array();
			getActions(dataset, actions.services, ACTN.ServiceAction);
			actions.plugins = new Array();
			getActions(dataset, actions.plugins, ACTN.PluginAction);
			return [actions, dataset];
		});
	return Promise.resolve(obj);
}

// for ?x http://www.w3.org/1999/02/22-rdf-syntax-ns#type http://www.ajan.de/behavior/bt-ns#BehaviorTree
function getActions(graph, actions, type) {
	Promise.resolve(graph).then(function(graph) {
		graph.forEach(quad => {
			if (
				quad.predicate.value === RDF.type &&
				quad.object.value === type
			) {
				if (type == ACTN.PluginAction) {
					actions.push(getActionDefinitions(graph, quad.subject, "PluginAction"));
				} else {
					actions.push(getActionDefinitions(graph, quad.subject, "ServiceAction"));
				}
			}
		});
	});
}

// Parse the ServiceAction
function getActionDefinitions(graph, resource, name) {
	let action = {};
	action.id = util.generateUUID();
	action.uri = resource.value;
	action.name = name;
	graph.forEach(function(quad) {
		if (quad.subject.equals(resource)) {
			if (quad.predicate.value === RDF.type) {
				action.type = quad.object.value;
			}
			if (quad.predicate.value === RDFS.label) {
				action.label = quad.object.value;
			}
			if (quad.predicate.value === ACTN.communication) {
				if (quad.object.value === ACTN.Synchronous) {
					action.communication = "Synchronous";
				} else {
					action.communication = "Asynchronous";
				}
			}
			if (quad.predicate.value === RDFS.label) {
				action.label = quad.object.value;
			}
			if (quad.predicate.value === ACTN.runBinding) {
				action.run = getBinding(graph, quad.object);
			}
			if (quad.predicate.value === ACTN.abortBinding) {
				action.abort = getBinding(graph, quad.object);
			}
			if (quad.predicate.value === ACTN.variables) {
				let variables = new Array();
				setVariables(variables, graph, quad.object)
				action.variables = variables;
			}
			if (quad.predicate.value === ACTN.consumes) {
				let consumes = {};
				consumes.uri = quad.object.value;
				consumes.sparql = getSparql(graph, quad.object);
				action.consumes = consumes;
			}
			if (quad.predicate.value === ACTN.produces) {
				let produces = {};
				produces.uri = quad.object.value;
				produces.sparql = getSparql(graph, quad.object);
				action.produces = produces;
			}
		}
	});
	return action;
}

function getBinding(graph, resource) {
	let binding = {};
	binding.uri = resource.value;
	graph.forEach(function(quad) {
		if(quad.subject.equals(resource)) {
      if (quad.predicate.value === HTTP.version) {
        binding.version = quad.object.value;
      }
			if (quad.predicate.value === HTTP.mthd) {
				if (quad.object.value === HTTP.Post) {
					binding.mthd = "POST";
				} else if (quad.object.value === HTTP.Put) {
					binding.mthd = "PUT";
				} else {
					binding.mthd = "GET";
				}
			}
			if (quad.predicate.value === HTTP.uri) {
				binding.requestUri = quad.object.value;
      }
      if (quad.predicate.value === HTTP.headers) {
        setHeaders(binding, graph, quad.object);
      }
      if (quad.predicate.value === ACTN.headers) {
        binding.actnHeaders = quad.object.value;
      }
			if (quad.predicate.value === HTTP.body) {
				let payload = {};
				payload.uri = quad.object.value;
				payload.sparql = getSparql(graph, quad.object);
				binding.payload = payload;
			}
		}
	});
	return binding;
}

function getSparql(graph, resource) {
	let sparql = "";
	graph.forEach(function(quad) {
		if(quad.subject.equals(resource)) {
			if(quad.predicate.value === ACTN.sparql) {
				sparql = quad.object.value;
			}
		}
	});
	return sparql;
}

function setVariables(variables, graph, resource) {
	graph.forEach(function(quad) {
		if(quad.subject.equals(resource)) {
			if(quad.predicate.value === RDF.first) {
				variables.push(getVariable(graph, quad.subject, quad.object));
			}
			if(quad.predicate.value === RDF.rest && quad.object.value != RDF.nil) {
				setVariables(variables, graph, quad.object);
			}
		}
	});
}

function getVariable(graph, pointer, resource) {
	let variable = {};
	variable.pointerUri = pointer.value;
	variable.uri = resource.value;
	graph.forEach(function(quad) {
		if(quad.subject.equals(resource)) {
			if(quad.predicate.value === SPIN.varName) {
				variable.var = quad.object.value;
			}
		}
	});
	return variable;
}

function setHeaders(binding, graph, resource) {
  graph.forEach(function (quad) {
    if (quad.subject.equals(resource)) {
      if (quad.predicate.value === RDF.first) {
        setHeader(quad.subject.value, binding, graph, quad.object);
      }
      if (quad.predicate.value === RDF.rest && quad.object.value != RDF.nil) {
        setHeaders(binding, graph, quad.object);
      }
    }
  });
}

function setHeader(root, binding, graph, resource) {
  let header = {};
  header.uri = resource.value;
  header.pointerUri = root;
  graph.forEach(function (quad) {
    if (quad.subject.equals(resource)) {
      if (quad.object.value === HTTP.accept) {
        binding.accept = header;
      }
      if (quad.object.value === HTTP.contentType) {
        binding.contentType = header;
      }
      if (quad.predicate.value === HTTP.fieldValue) {
        header.value = quad.object.value;
      }
    }
  });
}
