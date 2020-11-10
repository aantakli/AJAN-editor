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
import {RDF, RDFS, SPIN, AGENTS} from "ajan-editor/helpers/RDFServices/vocabulary";
import JsonLdParser from "npm:rdf-parser-jsonld";
import rdf from "npm:rdf-ext";
import stringToStream from "npm:string-to-stream";
import util from "ajan-editor/helpers/RDFServices/utility";

let parser = new JsonLdParser();

export default {
  getGoalsGraph: getGoalsGraph
};

function getGoalsGraph(data) {
	const quadStream = parser.import(stringToStream(JSON.stringify(data)));
	let obj = rdf
		.dataset()
		.import(quadStream)
		.then(function(dataset) {
			let goals = new Array();
      getGoals(dataset, goals);
      return [goals, dataset];
		});
	return Promise.resolve(obj);
}

function getGoals(graph, goals) {
	Promise.resolve(graph).then(function(graph) {
		graph.forEach(quad => {
			if (
				quad.predicate.value === RDF.type
				&& quad.object.value === AGENTS.Goal
			) {
        goals.push(getGoalsDefinitions(graph, quad.subject));
			}
		});
	});
}

function getGoalsDefinitions(graph, resource) {
  let goal = {};
  goal.id = util.generateUUID();
  goal.uri = resource.value;
  goal.name = "Goal";
  graph.forEach(function (quad) {
    if (quad.subject.equals(resource)) {
      if (quad.predicate.value === RDFS.label) {
        goal.label = quad.object.value;
      }
      if (quad.predicate.value === RDF.type) {
        goal.type = quad.object.value;
			}
      if (quad.predicate.value === AGENTS.variables) {
				let variables = new Array();
				setVariables(variables, graph, quad.object)
        goal.variables = variables;
			}
      if (quad.predicate.value === AGENTS.condition) {
        goal.condition = quad.object.value;
			}
    }
  });
  return goal;
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
				variable.varName = quad.object.value;
			}
			if(quad.predicate.value === AGENTS.dataType) {
				variable.dataType = quad.object.value;
			}
		}
	});
	return variable;
}
