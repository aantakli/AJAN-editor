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
  let quads = [];
  action.quads = quads;
	graph.forEach(function(quad) {
    if (quad.subject.equals(resource)) {
      if (quad.predicate.value === RDF.type) {
        if (quads) quads.push(quad);
        action.type = quad.object.value;
			}
      if (quad.predicate.value === RDFS.label) {
        if (quads) quads.push(quad);
        action.label = quad.object.value;
			}
      if (quad.predicate.value === ACTN.communication) {
        if (quads) quads.push(quad);
				if (quad.object.value === ACTN.Synchronous) {
          action.communication = "Synchronous";
				} else {
					action.communication = "Asynchronous";
				}
			}
      if (quad.predicate.value === RDFS.label) {
        if (quads) quads.push(quad);
        action.label = quad.object.value;
			}
      if (quad.predicate.value === ACTN.runBinding) {
        if (quads) quads.push(quad);
        action.run = getBinding(graph, quad.object, quads);
			}
      if (quad.predicate.value === ACTN.abortBinding) {
        if (quads) quads.push(quad);
        action.abort = getBinding(graph, quad.object, quads);
			}
			if (quad.predicate.value === ACTN.variables) {
        let variables = new Array();
        if (quads) quads.push(quad);
        setVariables(variables, graph, quad.object, quads)
				action.variables = variables;
			}
			if (quad.predicate.value === ACTN.consumes) {
				let consumes = {};
        consumes.uri = quad.object.value;
        if (quads) quads.push(quad);
        consumes.sparql = getSparql(graph, quad.object, quads);
				action.consumes = consumes;
			}
			if (quad.predicate.value === ACTN.produces) {
				let produces = {};
        produces.uri = quad.object.value;
        if (quads) quads.push(quad);
        produces.sparql = getSparql(graph, quad.object, quads);
				action.produces = produces;
			}
		}
	});
	return action;
}

function getBinding(graph, resource, quads) {
	let binding = {};
	binding.uri = resource.value;
	graph.forEach(function(quad) {
    if (quad.subject.equals(resource)) {
      if (quad.predicate.value === HTTP.version) {
        if (quads) quads.push(quad);
        binding.version = quad.object.value;
      }
      if (quad.predicate.value === HTTP.mthd) {
        if (quads) quads.push(quad);
        console.log(quad);
        binding.mthd = getStringMethod(quad.object.value);
			}
      if (quad.predicate.value === HTTP.uri) {
        if (quads) quads.push(quad);
				binding.requestUri = quad.object.value;
      }
      if (quad.predicate.value === HTTP.headers) {
        if (quads) quads.push(quad);
        setHeaders(binding, graph, quad.object, quads);
      }
      if (quad.predicate.value === ACTN.headers) {
        if (quads) quads.push(quad);
        binding.actnHeaders = quad.object.value;
      }
			if (quad.predicate.value === HTTP.body) {
				let payload = {};
        payload.uri = quad.object.value;
        if (quads) quads.push(quad);
				payload.sparql = getSparql(graph, quad.object, quads);
				binding.payload = payload;
			}
		}
	});
	return binding;
}

function getStringMethod(o) {
  if (o == HTTP.Post)
    return "POST";
  else if (o == HTTP.Put)
    return "PUT";
  else if (o == HTTP.Get)
    return "GET";
  else if (o == HTTP.Patch)
    return "PATCH";
  else if (o == HTTP.Delete)
    return "DELETE";
  else if (o == HTTP.Copy)
    return "COPY";
  else if (o == HTTP.Head)
    return "HEAD";
  else if (o == HTTP.Options)
    return "OPTIONS";
  else if (o == HTTP.Link)
    return "LINK";
  else if (o == HTTP.Unlink)
    return "UNLINK";
  else if (o == HTTP.Purge)
    return "PURGE";
  else if (o == HTTP.Lock)
    return "LOCK";
  else if (o == HTTP.Unlock)
    return "UNLOCK";
  else if (o == HTTP.Propfind)
    return "PROPFIND";
  else if (o == HTTP.View)
    return "VIEW";
  else
    return o;
}

function getSparql(graph, resource, quads) {
	let sparql = "";
	graph.forEach(function(quad) {
    if (quad.subject.equals(resource)) {
      if (quad.predicate.value === ACTN.sparql) {
        if (quads) quads.push(quad);
				sparql = quad.object.value;
			}
		}
	});
	return sparql;
}

function setVariables(variables, graph, resource, quads) {
	graph.forEach(function(quad) {
    if (quad.subject.equals(resource)) {
      if (quad.predicate.value === RDF.first) {
        if (quads) quads.push(quad);
				variables.push(getVariable(graph, quad.subject, quad.object, quads));
			}
      if (quad.predicate.value === RDF.rest && quad.object.value != RDF.nil) {
        if (quads) quads.push(quad);
				setVariables(variables, graph, quad.object, quads);
      }
      if (quad.predicate.value === RDF.rest && quad.object.value == RDF.nil) {
        if (quads) quads.push(quad);
      }
		}
	});
}

function getVariable(graph, pointer, resource, quads) {
	let variable = {};
	variable.pointerUri = pointer.value;
	variable.uri = resource.value;
  graph.forEach(function (quad) {
		if(quad.subject.equals(resource)) {
      if (quad.predicate.value === SPIN.varName) {
        if (quads) quads.push(quad);
				variable.var = quad.object.value;
			}
		}
	});
	return variable;
}

function setHeaders(binding, graph, resource, quads) {
  graph.forEach(function (quad) {
    if (quad.subject.equals(resource)) {
      if (quad.predicate.value === RDF.first) {
        if (quads) quads.push(quad);
        setHeader(quad.subject.value, binding, graph, quad.object, quads);
      }
      if (quad.predicate.value === RDF.rest && quad.object.value != RDF.nil) {
        if (quads) quads.push(quad);
        setHeaders(binding, graph, quad.object, quads);
      }
      if (quad.predicate.value === RDF.rest && quad.object.value == RDF.nil) {
        if (quads) quads.push(quad);
      }
    }
  });
}

function setHeader(root, binding, graph, resource, quads) {
  let header = {};
  header.uri = resource.value;
  header.pointerUri = root;
  graph.forEach(function (quad) {
    if (quad.subject.equals(resource)) {
      if (quad.object.value === HTTP.accept) {
        if (quads) quads.push(quad);
        binding.accept = header;
      }
      if (quad.object.value === HTTP.contentType) {
        if (quads) quads.push(quad);
        binding.contentType = header;
      }
      if (quad.predicate.value === HTTP.fieldValue) {
        if (quads) quads.push(quad);
        header.value = quad.object.value;
      }
    }
  });
}
