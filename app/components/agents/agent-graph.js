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
import Ember from "ember";
import globals from "ajan-editor/helpers/global-parameters";
import actions from "ajan-editor/helpers/agents/actions";
import btActions from "ajan-editor/helpers/behaviors/actions";
import rdfGraph from "ajan-editor/helpers/RDFServices/RDF-graph";
import nodeDefs from "ajan-editor/helpers/RDFServices/node-definitions/common";

import $ from 'jquery';

// References
let ajax = null; // ajax
let self;
//cy
let cy = null;

export default Ember.Component.extend({
  ajax: Ember.inject.service(),
  dataBus: Ember.inject.service('data-bus'),

  availableBTs: null,

  activeAgent: null,
  availableAgents: null,

  activeBehavior: null,
  regularBehavior: null,
  availableBehaviors: null,
  
  activeEndpoint: null,
  availableEndpoints: null,

  activeEvent: null,
  availableEvents: [],
  activeGoal: null,
  availableGoals: [],
  availableEventsandGoals:null,

  // After the element has been inserted into the DOM
  didInsertElement()
  {
    this._super(...arguments);
    self = this;
    initializeGlobals(this);
  
    loadRdfGraphData();
	
    setTriplestoreField();
    loadNodeDefinitionsThenGraph();
    this.dataBus.updatedAG();
  }, // end didInsertElement

  // ******************** Declare actions ********************
	// actions used in the .hbs file
	actions: {
		setActiveAgent(agent) {
			$(".agentshow").css("display","block");
			$(".behaviorshow").css("display","none");
			$(".eventshow").css("display","none");
			$(".endpointshow").css("display","none");
			$(".goalshow").css("display","none");
			self.set("activeAgent", agent);
			$("li.active").removeClass("active");
			$(function () {
				$("li[data-value='" + agent.uri + "']").addClass("active");
			});
		},

		setActiveBehavior(behavior, type) {
      if (type === "regular") {
        self.set("regularBehavior", true);
      } else {
        self.set("regularBehavior", false);
      }
			$("li.active").removeClass("active");
			$(".agentshow").css("display","none");
			$(".behaviorshow").css("display","block");
			$(".eventshow").css("display","none");
			$(".endpointshow").css("display","none");
      $(".goalshow").css("display", "none");
      self.set("activeBehavior", behavior);
			$(function () {
				$("li[data-value='" + behavior.uri + "']").addClass("active");
			});
		},

    setActiveEvent(event) {
      $(".agentshow").css("display","none");
      $(".behaviorshow").css("display","none");
      $(".eventshow").css("display","block");
      $(".endpointshow").css("display","none");
      $(".goalshow").css("display","none");
      self.set("activeEvent", event);
      $("li.active").removeClass("active");
      $(function () {
        $("li[data-value='" + event.uri + "']").addClass("active");
      });
    },

    setActiveEndpoint(endpoint) {
       $(".agentshow").css("display","none");
      $(".behaviorshow").css("display","none");
      $(".eventshow").css("display","none");
      $(".endpointshow").css("display","block");
      $(".goalshow").css("display","none");
      self.set("activeEndpoint", endpoint);
      $("li.active").removeClass("active");
      $(function () {
        $("li[data-value='" + endpoint.uri + "']").addClass("active");
      });
    },

    setActiveGoal(goal) {
      $(".agentshow").css("display","none");
      $(".behaviorshow").css("display","none");
      $(".eventshow").css("display","none");
      $(".endpointshow").css("display","none");
      $(".goalshow").css("display","block");
      self.set("activeGoal", goal);
      $("li.active").removeClass("active");
      $(function () {
        $("li[data-value='" + goal.uri + "']").addClass("active");
      });
    },

    createagent() {
        let agent = actions.createDefaultAgent(localStorage.currentStore);
        actions.createAgent(agent);
        self.get("availableAgents").addObject(agent);
        self.rerender();
        updateRepo();
      },

    createbehavior(type) {
      let behavior = null;
      if (type === "initial") {
        behavior = actions.createDefaultInitialBehavior(localStorage.currentStore);
        actions.createInitialBehavior(behavior);
        self.get("availableBehaviors.initial").addObject(behavior);
      }
      else if (type === "final") {
        behavior = actions.createDefaultFinalBehavior(localStorage.currentStore);
        actions.createFinalBehavior(behavior);
        self.get("availableBehaviors.final").addObject(behavior);
      }
      else {
        behavior = actions.createDefaultBehavior(localStorage.currentStore);
        actions.createBehavior(behavior);
        self.get("availableBehaviors.regular").addObject(behavior);
      }
      self.rerender();
      updateRepo();
     },

    createevent() {
      let event = actions.createDefaultEvent (localStorage.currentStore);
      actions.createEvent (event);
      self.get("availableEvents").addObject(event);
      self.get("availableEventsandGoals").addObject(event);
      self.rerender();
      updateRepo();
    },

    createendpoint() {
      let endpoint = actions.createDefaultEndpoint(localStorage.currentStore);
      actions.createEndpoint(endpoint);
      self.get("availableEndpoints").addObject(endpoint);
      self.rerender();
      updateRepo();
    },

    creategoal() {
      let goal = actions.createDefaultGoal(localStorage.currentStore);
      self.get("availableGoals").addObject(goal);
      self.get("availableEventsandGoals").addObject(event);
      self.rerender();
      updateRepo();
    },
  },

	willDestroyElement() {
		this._super(...arguments);
		//cy
    //cleanDOM();
	}

}); // end Ember export


function initializeGlobals(currentComponent) {
	setCurrentComponent(currentComponent);
	initializeAjax();
}

function setCurrentComponent(currentComponent) {
	globals.currentComponent = currentComponent;
}

function initializeAjax() {
	ajax = globals.currentComponent.get("ajax");
	globals.ajax = ajax;
}

function loadNodeDefinitionsThenGraph() {
	nodeDefs(ajax,null).then(loadbtRdfGraphData);
}

function loadRdfGraphData() {
	let repo = (localStorage.currentStore || "http://localhost:8090/rdf4j/repositories")
            + globals.agentsRepository;
  actions.getAgentFromServer(ajax, repo).then(agentrdfDataHasLoaded)
    .then(actions.getBehaviorsFromServer(ajax, repo).then(behaviorrdfDataHasLoaded)
      .then(actions.getEventsFromServer(ajax, repo).then(eventrdfDataHasLoaded)
        .then(actions.getEndpointsFromServer(ajax, repo).then(endpointrdfDataHasLoaded)
          .then(actions.getGoalsFromServer(ajax, repo).then(goalrdfDataHasLoaded)))));
}

function loadbtRdfGraphData() {
	let repo = (localStorage.currentStore || "http://localhost:8090/rdf4j/repositories")
            + globals.behaviorsRepository;
	btActions.getFromServer(cy, ajax, repo).then(btrdfDataHasLoaded);
}

function agentrdfDataHasLoaded(rdfData) {
	rdfGraph.reset();
	rdfGraph.set(rdfData);
	setAvailableAgents();
}

function behaviorrdfDataHasLoaded(rdfData) {
	rdfGraph.reset();
	rdfGraph.set(rdfData);
  setAvailableBehaviors();
}

function eventrdfDataHasLoaded(rdfData) {
	rdfGraph.reset();
	rdfGraph.set(rdfData);
	setAvailableEvents();
}

function endpointrdfDataHasLoaded(rdfData) {
	rdfGraph.reset();
	rdfGraph.set(rdfData);
	setAvailableEndpoints();
}

function goalrdfDataHasLoaded(rdfData) {
	rdfGraph.reset();
	rdfGraph.set(rdfData);
  setAvailableGoals();
  updateActionBar();
}

function btrdfDataHasLoaded(rdfData) {
	setAvailableBTs();
}

function setAvailableAgents() {
	let agents = actions.getAgents();
	self.set("availableAgents", agents);
	if (agents.length > 0) {
		self.actions.setActiveAgent(agents[0]);
	}
}

function setAvailableBehaviors() {
	let behaviors = actions.getBehaviors();
  self.set("availableBehaviors", behaviors);
}

function setAvailableEvents() {
	let events = actions.getEvents();
  self.set("availableEvents", events);
}

function setAvailableEndpoints() {
	let endpoints = actions.getEndpoints();
  self.set("availableEndpoints", endpoints);
}

function setAvailableGoals() {
  let goals = actions.getGoals();
	self.set("availableGoals", goals);
	let EventsandGoals=self.get("availableEvents").concat(self.get("availableGoals"));
	self.set("availableEventsandGoals",EventsandGoals);
}

function setAvailableBTs() {
	let bts = btActions.getBehaviorTrees();
	self.set("availableBTs", bts);
}

function updateRepo() {
	let repo = (localStorage.currentStore || "http://localhost:8090/rdf4j/repositories")
    + globals.agentsRepository;
  updateActionBar();
  actions.saveAgentGraph(globals.ajax, repo, self.dataBus);
}

function setTriplestoreField() {
	$(".store-url").text(localStorage.currentStore);
}

function updateActionBar() {
  let agentDefs = {
    templates: self.get("availableAgents"),
    behaviors: self.get("availableBehaviors"),
    endpoints: self.get("availableEndpoints"),
    events: self.get("availableEvents"),
    goals: self.get("availableGoals"),
  };
  self.dataBus.updateAgentDefs(agentDefs);
}
