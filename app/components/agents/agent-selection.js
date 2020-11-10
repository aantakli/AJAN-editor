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

let $ = Ember.$;

// References
let ajax = null; // ajax
let self;

export default Ember.Component.extend({
	ajax: Ember.inject.service(),
	dataBus: Ember.inject.service(),

	activeAgent: null,

	availableAgents: null,
	availableBTs: null,


  // After the element has been inserted into the DOM
  didInsertElement()
  {
    this._super(...arguments);
    // ...
    self = this;
    initializeGlobals(this);
    loadagentRdfData();
	loadbtRdfData();
    setTriplestoreField();
    console.log("availableAgents");
    console.log(availableAgents);
	console.log("availableBTs");
	console.log(availableBTs);

  }, // end didInsertElement

  // ******************** Declare actions ********************
	// actions used in the .hbs file
	actions: {
    setActiveAgent(agent) {
			self.set("activeAgent", agent);
			$("li.active").removeClass("active");
			$(function(){$("li[data-value='" + agent.uri + "']").addClass("active");});
	  },
	},

	willDestroyElement() {
		this._super(...arguments);
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

function loadagentRdfData() {
	let repo = (localStorage.currentStore || "http://localhost:8090/rdf4j/repositories")
            + globals.agentsRepository;
	actions.getAgentFromServer(ajax,repo).then(agentrdfDataHasLoaded);//
}

function loadbtRdfData() {
	let repo = (localStorage.currentStore || "http://localhost:8090/rdf4j/repositories")
            + globals.behaviorsRepository;
	btActions.getFromServer(ajax,repo).then(btrdfDataHasLoaded);//
}

function agentrdfDataHasLoaded(rdfData) {
	rdfGraph.reset();//
	rdfGraph.set(rdfData);
	setAvailableAgents();
}

function btrdfDataHasLoaded(rdfData) {
	rdfGraph.reset();//
	rdfGraph.set(rdfData);
	setAvailableBTs();
}

function setAvailableAgents() {
	let agents = actions.getAgents();
	self.set("availableAgents", agents);
	if (agents.length > 0) {
		self.actions.setActiveAgent(agents[0]);
	}
}

function setAvailableBTs() {
	let bts = btActions.getBehaviorTrees();
	self.set("availableBTs", bts);
}

function updateRepo() {
	let repo = (localStorage.currentStore || "http://localhost:8090/rdf4j/repositories")
						+ globals.agentsRepository;
	actions.saveAgentGraph(globals.ajax,repo);
}

function setTriplestoreField() {
	$(".store-url").text(localStorage.currentStore);
}
