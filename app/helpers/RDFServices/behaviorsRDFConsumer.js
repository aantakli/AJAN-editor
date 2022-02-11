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
import {BT, ACTN, RDF, RDFS, DCT, HTTP, SPIN, AGENTS} from "ajan-editor/helpers/RDFServices/vocabulary";
import JsonLdParser from "npm:rdf-parser-jsonld";
import rdf from "npm:rdf-ext";
import stringToStream from "npm:string-to-stream";
import util from "ajan-editor/helpers/RDFServices/utility";

let parser = new JsonLdParser();

export default {
  getBehaviorsGraph: getBehaviorsGraph
};

//TODO: Replace graph parameter in methods by call to singleton
// BODY

// Use this to parse data for behavior
// Request the entire graph
function getBehaviorsGraph(data) {
    console.log("get behavior graph");
	const quadStream = parser.import(stringToStream(JSON.stringify(data)));

	let obj = rdf
		.dataset()
		.import(quadStream)
		.then(function(dataset) {
			// Dataset is array of quads
      let behaviors = {};
      behaviors.initial = new Array({});
      behaviors.final = new Array({});
      behaviors.regular = new Array();
      getBehaviors(dataset, behaviors);
      return [behaviors, dataset];
		});
	return Promise.resolve(obj);

}

// for ?x http://www.w3.org/1999/02/22-rdf-syntax-ns#type http://www.ajan.de/behavior/bt-ns#BehaviorTree

function getBehaviors(graph, behaviors) {
	Promise.resolve(graph).then(function(graph) {
		graph.forEach(quad => {
			if (
				quad.predicate.value === RDF.type
				&& quad.object.value === AGENTS.Behavior
			) {
        behaviors.regular.push(getBehaviorsDefinitions(graph, quad.subject, AGENTS.Behavior, "ajan:Behavior"));
      }
      else if (
        quad.predicate.value === RDF.type
        && quad.object.value === AGENTS.InitialBehavior
      ) {
        behaviors.initial.push(getBehaviorsDefinitions(graph, quad.subject, AGENTS.InitialBehavior, "ajan:InitialBehavior"));
      }
      else if (
        quad.predicate.value === RDF.type
        && quad.object.value === AGENTS.FinalBehavior
      ) {
        behaviors.final.push(getBehaviorsDefinitions(graph, quad.subject, AGENTS.FinalBehavior, "ajan:FinalBehavior"));
      }
		});
	});

}



// Parse the ServiceAction


function getBehaviorsDefinitions(graph, resource, type, short) {
  let behaviors = {};
  let triggers = new Array();
  behaviors.id = util.generateUUID();
  behaviors.uri = resource.value;
  behaviors.addtype = "";
  behaviors.requires = "";
  behaviors.name = "Behavior";
  graph.forEach(function (quad) {

    if (quad.subject.equals(resource)) {

      if (quad.predicate.value === RDFS.label) {
        behaviors.label = quad.object.value;
      }
      if (quad.predicate.value === RDF.type && quad.object.value === type) {
        behaviors.type = quad.object.value;
        behaviors.typeforshort = short;
      }
      if (quad.predicate.value === RDF.type
        && quad.object.value !== AGENTS.InitialBehavior
        && quad.object.value !== AGENTS.FinalBehavior
        && quad.object.value !== AGENTS.Behavior) {
        behaviors.addtype = quad.object.value;
      }
      if (quad.predicate.value === DCT.requires) {
        behaviors.requires = quad.object.value;
      }
      if (quad.predicate.value === AGENTS.trigger && type === AGENTS.Behavior) {
        behaviors.triggers = {};
        behaviors.triggers.uri = quad.object.value;
        graph.forEach(function (innerquad) {
          if (innerquad.subject.equals(quad.object)) {
            if (innerquad.predicate.value === RDFS.label) {
              behaviors.triggers.label = innerquad.object.value;
            }
          }
        });
        triggers.push(behaviors.triggers);
      }
      if (quad.predicate.value === AGENTS.bt) {
        behaviors.bt = {};
        behaviors.bt.uri = quad.object.value;
        var str = behaviors.bt.uri;
        var start = str.indexOf("#") + 1;
        var end = str.length;
        behaviors.bt.label = str.substring(start, end);
      }
      if (quad.predicate.value === AGENTS.clearEKB) {
        behaviors.clearEKB = quad.object.value;
      }
    }
  });
  behaviors.triggers = triggers;
  return behaviors;
}
