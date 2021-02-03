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
import ajaxActions from "ajan-editor/helpers/agents/actions/ajax";
import behaviorajaxActions from "ajan-editor/helpers/agents/actions/behaviorajax";
import eventajaxActions from "ajan-editor/helpers/agents/actions/eventajax";
import endpointajaxActions from "ajan-editor/helpers/agents/actions/endpointajax";
import goalajaxActions from "ajan-editor/helpers/agents/actions/goalajax";
import rdfGraph from "ajan-editor/helpers/RDFServices/RDF-graph";
import rdfManager from "ajan-editor/helpers/RDFServices/RDF-manager";
import utility from "ajan-editor/helpers/RDFServices/utility";
import agentProducer from "ajan-editor/helpers/RDFServices/agentsRDFProducer";
import behaviorProducer from "ajan-editor/helpers/RDFServices/behaviorsRDFProducer";
import eventProducer from "ajan-editor/helpers/RDFServices/eventsRDFProducer";
import endpointProducer from "ajan-editor/helpers/RDFServices/endpointsRDFProducer";
import goalProducer from "ajan-editor/helpers/RDFServices/goalsRDFProducer";
import { AGENTS, XSD, RDF, RDFS } from "ajan-editor/helpers/RDFServices/vocabulary";
import rdf from "npm:rdf-ext";
import N3 from "npm:rdf-parser-n3";
import stringToStream from "npm:string-to-stream";

export default {
	// Delete Service Object
  deleteAgent: deleteAgent,
  deleteBehavior: deleteBehavior,
  deleteEvent: deleteEvent,
  deleteEndpoint: deleteEndpoint,
  deleteGoal: deleteGoal,
  deleteVariable: deleteVariable,

  deleteactiveAgentsInitialbehavior: deleteactiveAgentsInitialbehavior,
  deleteactiveAgentsFinalbehavior: deleteactiveAgentsFinalbehavior,
  deleteactiveAgentsbehavior: deleteactiveAgentsbehavior,
  deleteactiveAgentsevent:deleteactiveAgentsevent,
  deleteactiveAgentsendpoint:deleteactiveAgentsendpoint,

  deleteactiveBehaviorstrigger: deleteactiveBehaviorstrigger,
  deleteactiveBehaviorsbt:deleteactiveBehaviorsbt,
  deleteactiveEndpointsevent:deleteactiveEndpointsevent,

	createDefaultAgent: createDefaultAgent,
  createDefaultInitialBehavior: createDefaultInitialBehavior,
  createDefaultFinalBehavior: createDefaultFinalBehavior,
  createDefaultBehavior: createDefaultBehavior,
  createDefaultEvent: createDefaultEvent,
  createDefaultEndpoint: createDefaultEndpoint,
  createDefaultGoal: createDefaultGoal,

  createAgent: agentProducer.createAgent,
  createInitialBehavior: behaviorProducer.createInitialBehavior,
  createFinalBehavior: behaviorProducer.createFinalBehavior,
  createBehavior: behaviorProducer.createBehavior,
  createEvent: eventProducer.createEvent,
  createEndpoint: endpointProducer.createEndpoint,
  createGoal: goalProducer.createGoal,
  createVariable: goalProducer.createVariable,
  appendVariable: goalProducer.appendVariable,

	// AJAX related Actions
	getAgents: ajaxActions.getAgents,
	getAgentFromServer: ajaxActions.getFromServer,
	saveAgentGraph: ajaxActions.saveGraph,
  //
  getBehaviors: behaviorajaxActions.getBehaviors,
	getBehaviorsFromServer: behaviorajaxActions.getFromServer,
	saveBehaviorsGraph: behaviorajaxActions.saveGraph,
  //
  getEvents: eventajaxActions.getEvents,
	getEventsFromServer: eventajaxActions.getFromServer,
	saveEventsGraph: eventajaxActions.saveGraph,
  //
  getEndpoints: endpointajaxActions.getEndpoints,
	getEndpointsFromServer: endpointajaxActions.getFromServer,
	saveEndpointsGraph: endpointajaxActions.saveGraph,
  //
  getGoals: goalajaxActions.getGoals,
	getGoalsFromServer: goalajaxActions.getFromServer,
  saveGoalsGraph: goalajaxActions.saveGraph,
  //
  readTTLInput: readTTLInput
};

function deleteAgent(agent) {
	console.log(agent);
	rdfGraph.removeAllRelated(agent.uri);
}

function deleteBehavior(behavior) {
	console.log(behavior);
	rdfGraph.removeAllRelated(behavior.uri);
}
function deleteEvent(event) {
	console.log(event);
	rdfGraph.removeAllRelated(event.uri);
}
function deleteEndpoint(endpoint) {
	console.log(endpoint);
	rdfGraph.removeAllRelated(endpoint.uri);
}

function deleteGoal(goal) {
  console.log(goal);
  deleteVariables(goal.variables)
	rdfGraph.removeAllRelated(goal.uri);
}

function deleteVariables(variables) {
  variables.forEach(function (item, index, arr) {
    deleteVariable(variables, item);
  });
}

function deleteVariable(ele, val) {
  rdfManager.removeListItem(val.pointerUri);
  ele = ele.filter(item => item !== val);
  rdfGraph.removeAllRelated(val.uri);
  return ele;
}

function deleteactiveAgentsInitialbehavior(activeAgent) {
  console.log(activeAgent.initialBehavior);
  rdfGraph.removeRelatedInitialbehavior(activeAgent.uri);
}

function deleteactiveAgentsFinalbehavior(activeAgent) {
  console.log(activeAgent.finalBehavior);
  rdfGraph.removeRelatedFinalbehavior(activeAgent.uri);
}

function deleteactiveAgentsbehavior(activeAgent) {
	console.log(activeAgent.behavior);
	rdfGraph.removeRelatedbehavior(activeAgent.uri);
}

function deleteactiveAgentsevent(activeAgent) {
	console.log(activeAgent.event);
	rdfGraph.removeRelatedevent(activeAgent.uri);
}

function deleteactiveAgentsendpoint(activeAgent) {
	console.log(activeAgent.endpoint);
	rdfGraph.removeRelatedendpoint(activeAgent.uri);
}
///////for individual behaviror
function deleteactiveBehaviorstrigger(activeBehavior){
  console.log(activeBehavior.trigger);
	rdfGraph.removeRelatedtrigger(activeBehavior.uri);
}

function deleteactiveBehaviorsbt(activeBehavior){
  console.log(activeBehavior.bt);
	rdfGraph.removeRelatedbt(activeBehavior.uri);
}

/////////for individual Endpoint
function deleteactiveEndpointsevent(activeEndpoint){
  console.log(activeEndpoint.event);
	rdfGraph.removeRelatedEndpointsevent(activeEndpoint.uri);

}

function createDefaultAgent(repo) {
  let agent = {};
  agent.uri = repo + "agents#AG_" + utility.generateUUID();
  agent.type = AGENTS.AgentTemplate;
  agent.label = "Default AgentTemplate";
  agent.behaviors = new Array();
  agent.events = new Array();
  agent.endpoints = new Array();
  return agent;
}

function createDefaultInitialBehavior(repo) {
  let behavior = {};
  behavior.uri = repo + "agents#IB_" + utility.generateUUID();
  behavior.type = AGENTS.InitialBehavior;
  behavior.label = "Default InitialBehavior";
  let bt = {};
  bt.label = "";
  bt.uri = "";
  behavior.bt = bt;
  return behavior;
}

function createDefaultFinalBehavior(repo) {
  let behavior = {};
  behavior.uri = repo + "agents#FB_" + utility.generateUUID();
  behavior.type = AGENTS.FinalBehavior;
  behavior.label = "Default FinalBehavior";
  let bt = {};
  bt.label = "";
  bt.uri = "";
  behavior.bt = bt;
  return behavior;
}

function createDefaultBehavior(repo) {
  let behavior = {};
  behavior.uri = repo + "agents#BE_" + utility.generateUUID();
  behavior.type = AGENTS.Behavior;
  behavior.label = "Default Behavior";
  behavior.addtype = "";
  behavior.requires = "";
  behavior.triggers = new Array();
  let bt = {};
  bt.label = "";
  bt.uri = "";
  behavior.bt = bt;
  return behavior;
}

function createDefaultEvent(repo) {
  let event = {};
  event.type = AGENTS.Event;
  event.uri = repo + "agents#EV_" + utility.generateUUID();
  event.label = "Default Event";
  return event;
}

function createDefaultEndpoint(repo) {
  let endpoint = {};
  endpoint.uri = repo + "agents#EP_" + utility.generateUUID();
  endpoint.type = AGENTS.Endpoint;
  endpoint.label = "Default Endpoint";
  endpoint.capability = "";
  endpoint.events = new Array();
  return endpoint;
}

function createDefaultGoal(repo) {
  let goal = {};
  goal.uri = repo + "agents#GO_" + utility.generateUUID();
  goal.label = "Default Goal";
  goal.type = AGENTS.Goal;
  goal.variables = new Array();
  goal.variables.push({ pointerUri: "", uri: "", varName: "s", dataType: RDFS.Resource });
  goal.variables.push({ pointerUri: "", uri: "", varName: "p", dataType: RDFS.Resource });
  goal.variables.push({ pointerUri: "", uri: "", varName: "o", dataType: XSD.string });
  goal.condition = "ASK WHERE { ?s ?p ?o }";
  return goal;
}

function readTTLInput(content, onend) {
  let parser = new N3({ factory: rdf });
  let quadStream = parser.import(stringToStream(content));
  let importFile = {
    quads: [],
    agents: [],
    behaviors: [],
    endpoints: [],
    events: [],
    goals: []
  };
  rdf.dataset().import(quadStream).then((dataset) => {
    dataset.forEach((quad) => {
      importFile.quads.push(quad);
      if (quad.predicate.value === RDF.type && quad.object.value === AGENTS.AgentTemplate) {
        importFile.agents.push(quad.subject.value);
      } else if (quad.predicate.value === RDF.type && quad.object.value === AGENTS.InitialBehavior) {
        importFile.behaviors.push(quad.subject.value);
      } else if (quad.predicate.value === RDF.type && quad.object.value === AGENTS.FinalBehavior) {
        importFile.behaviors.push(quad.subject.value);
      } else if (quad.predicate.value === RDF.type && quad.object.value === AGENTS.Behavior) {
        importFile.behaviors.push(quad.subject.value);
      } else if (quad.predicate.value === RDF.type && quad.object.value === AGENTS.Endpoint) {
        importFile.endpoints.push(quad.subject.value);
      } else if (quad.predicate.value === RDF.type && quad.object.value === AGENTS.Event) {
        importFile.events.push(quad.subject.value);
      } else if (quad.predicate.value === RDF.type && quad.object.value === AGENTS.Goal) {
        importFile.goals.push(quad.subject.value);
      }
    });
    onend(importFile);
  });
}
