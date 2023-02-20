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
import { RDF, RDFS, AGENTS, XSD} from "ajan-editor/helpers/RDFServices/vocabulary";
import rdfGraph from "ajan-editor/helpers/RDFServices/RDF-graph";
import rdfFact from "ajan-editor/helpers/RDFServices/RDF-factory";
import rdf from "npm:rdf-ext";

export default {
  createAgent: createAgent,
  createAgentRDFString: createAgentRDFString
};
// editing ajan

function createAgent(definition) {
	rdfGraph.add(rdfFact.quad(definition.uri, RDF.type, AGENTS.AgentTemplate));
  rdfGraph.add(rdfFact.quadLiteral(definition.uri, RDFS.label, definition.label));
}

function createAgentRDFString(definition) {
  let quads = rdf.dataset();
  createTeamplateQuads(quads, definition.template);
  createEventQuads(quads, definition.event);
  createBehaviorQuads(quads, definition.behavior);
  createEndpointQuads(quads, definition.endpoint);
  return rdfGraph.toString(quads);
}

function createTeamplateQuads(quads, template) {
  quads.add(rdfFact.quad(template.uri, RDF.type, AGENTS.AgentTemplate));
  quads.add(rdfFact.quadLiteral(template.uri, RDFS.label, template.label));
  if (template.events.length > 0) {
    addEvents(quads, template)
  }
  if (template.behaviors.length > 0) {
    addBehaviors(quads, template)
  }
  if (template.endpoints.length > 0) {
    addEndpoints(quads, template)
  }
}

function createEventQuads(quads, event) {
  quads.add(rdfFact.quad(event.uri, RDF.type, AGENTS.Event));
  quads.add(rdfFact.quadLiteral(event.uri, RDFS.label, event.label));
}

function createBehaviorQuads(quads, behavior) {
  quads.add(rdfFact.quad(behavior.uri, RDF.type, AGENTS.Behavior));
  quads.add(rdfFact.quadLiteral(behavior.uri, RDFS.label, behavior.label));
  quads.add(rdfFact.quad(behavior.uri, AGENTS.bt, behavior.bt.uri));
  console.log(behavior.triggers);
  behavior.triggers.forEach(function (event) {
    quads.add(rdfFact.quad(behavior.uri, AGENTS.trigger, event));
  })
  console.log(behavior.clearEKB);
  quads.add(rdfFact.quadLiteral(behavior.uri, AGENTS.clearEKB, behavior.clearEKB, XSD.boolean));
}

function createEndpointQuads(quads, endpoint) {
  quads.add(rdfFact.quad(endpoint.uri, RDF.type, AGENTS.Endpoint));
  quads.add(rdfFact.quadLiteral(endpoint.uri, RDFS.label, endpoint.label));
  quads.add(rdfFact.quad(endpoint.uri, AGENTS.event, endpoint.events[0].uri));
  quads.add(rdfFact.quadLiteral(endpoint.uri, AGENTS.capability, endpoint.capability));
}

function addEvents(quads, definition) {
  definition.events.forEach(function (event) {
    quads.add(rdfFact.quad(definition.uri, AGENTS.event, event));
  })
}

function addBehaviors(quads, definition) {
  definition.behaviors.forEach(function (behavior) {
    quads.add(rdfFact.quad(definition.uri, AGENTS.behavior, behavior));
  })
}

function addEndpoints(quads, definition) {
  definition.endpoints.forEach(function (endpoint) {
    quads.add(rdfFact.quad(definition.uri, AGENTS.endpoint, endpoint));
  })
}
