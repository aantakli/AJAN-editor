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
import rdfFact from "ajan-editor/helpers/RDFServices/RDF-factory";
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
  readTTLInput: readTTLInput,
  getAgentDefsMatches: getAgentDefsMatches,
  getTTLMatches: getTTLMatches,
  deleteMatches: deleteMatches,
  exportGoal: exportGoal
};

function deleteAgent(agent, noObject) {
	console.log(agent);
  rdfGraph.removeAllRelated(agent.uri, noObject);
}

function deleteBehavior(behavior, noObject) {
	console.log(behavior);
  rdfGraph.removeAllRelated(behavior.uri, noObject);
}
function deleteEvent(event, noObject) {
	console.log(event);
  rdfGraph.removeAllRelated(event.uri, noObject);
}
function deleteEndpoint(endpoint, noObject) {
	console.log(endpoint);
  rdfGraph.removeAllRelated(endpoint.uri, noObject);
}

function deleteGoal(goal, noObject) {
  console.log(goal);
  goal.variables.forEach(item => {
    rdfGraph.removeAllRelated(item.uri);
    rdfGraph.removeAllRelated(item.pointerUri);
  });
  rdfGraph.removeAllRelated(goal.consumes.uri);
  rdfGraph.removeAllRelated(goal.produces.uri);
  rdfGraph.removeAllRelated(goal.uri, noObject);
}

function deleteVariable(ele, val) {
  rdfManager.removeListItem(val.pointerUri);
  ele = ele.filter(item => item !== val);
  rdfGraph.removeAllRelated(val.uri);
  return ele;
}

function createDefaultAgent(repo) {
  let agent = {};
  agent.uri = repo + "agents#AG_" + utility.generateUUID();
  agent.type = AGENTS.AgentTemplate;
  agent.label = "Default AgentTemplate";
  agent.name = "AgentTemplate";
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
  behavior.name = "InitialBehavior";
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
  behavior.name = "FinalBehavior";
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
  behavior.behavior = "Behavior";
  behavior.addtype = "";
  behavior.requires = "";
  behavior.triggers = new Array();
  let bt = {};
  bt.label = "";
  bt.uri = "";
  behavior.bt = bt;
  behavior.clearEKB = false;
  return behavior;
}

function createDefaultEvent(repo) {
  let event = {};
  event.type = AGENTS.Event;
  event.uri = repo + "agents#EV_" + utility.generateUUID();
  event.label = "Default Event";
  event.name = "Event";
  return event;
}

function createDefaultEndpoint(repo) {
  let endpoint = {};
  endpoint.uri = repo + "agents#EP_" + utility.generateUUID();
  endpoint.type = AGENTS.Endpoint;
  endpoint.name = "Endpoint";
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
  goal.name = "Goal";
  goal.variables = [{ uri: rdfFact.blankNode().value, var: "s" }];

  let consumes = {};
  consumes.uri = "";
  consumes.sparql = "ASK WHERE { ?s ?p ?o }";

  let produces = {};
  produces.uri = "";
  produces.sparql = "ASK WHERE { ?s ?p ?o }";

  goal.consumes = consumes;
  goal.produces = produces;
  return goal;
}

function readTTLInput(content, onend) {
  let parser = new N3({ factory: rdf });
  let quadStream = parser.import(stringToStream(content));
  let importFile = {
    raw: content,
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

function getAgentDefsMatches(agentDefs, importFile) {
  let matches = getTTLMatches(agentDefs.templates, importFile.agents);
  matches = matches.concat(getTTLMatches(agentDefs.behaviors.final, importFile.behaviors));
  matches = matches.concat(getTTLMatches(agentDefs.behaviors.initial, importFile.behaviors));
  matches = matches.concat(getTTLMatches(agentDefs.behaviors.regular, importFile.behaviors));
  matches = matches.concat(getTTLMatches(agentDefs.endpoints, importFile.endpoints));
  matches = matches.concat(getTTLMatches(agentDefs.events, importFile.events));
  matches = matches.concat(getTTLMatches(agentDefs.goals, importFile.goals));
  return matches;
}

function getTTLMatches(defs, imports) {
  let matches = [];
  if (imports) {
    defs.forEach((data) => {
      imports.forEach((item) => {
        if (data.uri === item) {
          matches.push(data);
        }
      });
    });
  }
  return matches;
}

function deleteMatches(matches) {
  if (matches.length > 0) {
    matches.forEach((data) => {
      if (data.type === AGENTS.AgentTemplate)
        deleteAgent(data, true);
      else if (data.type === AGENTS.InitialBehavior)
        deleteBehavior(data, true);
      else if (data.type === AGENTS.FinalBehavior)
        deleteBehavior(data, true);
      else if (data.type === AGENTS.Behavior)
        deleteBehavior(data, true);
      else if (data.type === AGENTS.Endpoint)
        deleteEndpoint(data, true);
      else if (data.type === AGENTS.Event) {
        deleteEvent(data, true);
      } else if (data.type === AGENTS.Goal) {
        deleteGoal(data, true);
      }
    });
  }
}

function exportGoal(nodeURI) {
  let goal = new Array();
  let nodes = new Array();
  visitNode(nodeURI, nodes);
  nodes.forEach(uri => {
    let quads = rdfGraph.getAllQuads(uri);
    quads.forEach(quad => {
      goal.push(quad);
    })
  });
  return goal;
}

function visitNode(uri, nodes) {
  rdfGraph.forEach(quad => {
    if (quad.subject.value === uri) {
      if (quad.object.value !== RDF.nil && quad.predicate.value !== RDF.type) {
        let child = quad.object.value;
        if (!nodes.includes(uri))
          nodes.push(uri);
        visitNode(child, nodes);
      }
    }
  });
}
