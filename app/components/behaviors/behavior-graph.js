/*
 * Created on Tue Nov 10 2020
 *
 * The MIT License (MIT)
 * Copyright (c) 2020 André Antakli, Alex Grethen (German Research Center for Artificial Intelligence, DFKI).
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
import actions from "ajan-editor/helpers/behaviors/actions";
import actionsAgnt from "ajan-editor/helpers/agents/actions";
import {cleanDOM} from "ajan-editor/helpers/graph/cy-cleanup";
import Ember from "ember";
import events from "ajan-editor/helpers/behaviors/event-bindings";
import globals from "ajan-editor/helpers/global-parameters";
import nodeDefs from "ajan-editor/helpers/RDFServices/node-definitions/common";
import rdfGraph from "ajan-editor/helpers/RDFServices/RDF-graph";
import rdfManager from "ajan-editor/helpers/RDFServices/RDF-manager";
import utility from "ajan-editor/helpers/RDFServices/utility";
import { AGENTS, XSD, RDF, RDFS } from "ajan-editor/helpers/RDFServices/vocabulary";
import Split from "npm:split.js";

let $ = Ember.$;

// References
let cy = null; // cytoscape
let ajax = null; // ajax
// let undoRedo = null; // undoRedo
let ur = null; // undoRedo
let that;

export default Ember.Component.extend({
	classNames: ["full-height"],
  ajax: Ember.inject.service(),
  cytoscapeService: Ember.inject.service("behaviors/cytoscape"),
  dataBus: Ember.inject.service(),
  availableBTs: undefined,
  availableEvents: undefined,
  availableBehaviors: undefined,
  availableEndpoints: undefined,
  cyRef: undefined,

  init() {
    this._super(...arguments);
    that = this;
    this.get('dataBus').on('addBT', function (bt) {
      createBT(bt);
    });
    this.get('dataBus').on('generateAgent', function (bt) {
      generateAgent();
    });
    this.get('dataBus').on('cloneBT', function () {
      cloneBT();
    });
    this.get('dataBus').on('exportBT', function () {
      that.get('dataBus').saveExportedBT(exportBT());
    });
    this.get('dataBus').on('importBT', function (bt) {
      importBT(bt);
    });
    this.get('dataBus').on('deleteBT', function () {
      deleteBT();
    });
  },

	// After the element has been inserted into the DOM
	didInsertElement() {
		this._super(...arguments);

		initializeCytoscape(this);
		initializeGlobals(this);
		initializeSplitPanes();
		setTriplestoreField();
		bindRequiredEvents();
		bindCyRefresh();
		cy.resize();

    loadNodeDefinitionsThenGraph();
	}, // end didInsertElement

	// ******************** Declare actions ********************
	// actions used in the .hbs file
	actions: {
    
	},

	willDestroyElement() {
		this._super(...arguments);
		cleanDOM();
	}
}); // end Ember export

function initializeCytoscape(that) {
	cy = that.get("cytoscapeService").newCytoscapeInstance();
	ur = that.get("cytoscapeService").ur;
	globals.cy = cy;
	that.set("cyRef",cy)
}

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

function initializeSplitPanes() {
	Split(["#split-left", "#split-middle", "#split-right"], {
		sizes: [15.5, 60, 24.5],
		minSize: [0, 300, 0],
		direction: "horizontal",
		cursor: "col-resize",
		gutterSize: 10,
		onDragEnd: () => {
			cy.resize();
		}
	});
}

function loadNodeDefinitionsThenGraph() {
  nodeDefs(ajax, cy).then(loadBTRdfGraphData);
  loadAgentsRdfGraphData();
}

function loadBTRdfGraphData() {
	let repo =
		(localStorage.currentStore || "http://localhost:8090/rdf4j/repositories") +
		"/" +
    globals.behaviorsRepository;
  if (repo.includes("repositories//behaviors")) {
    repo = repo.replace("repositories//behaviors", "repositories/behaviors");
  }
	actions.getFromServer(cy, ajax, repo).then(rdfDataHasLoaded);
}

function rdfDataHasLoaded(rdfData) {
	rdfGraph.set(rdfData);
  setAvailableBTs();
	bindEvents();
  cy.resize();
  that.dataBus.updatedBT();
}

function setAvailableBTs() {
  let behaviorTrees = actions.getBehaviorTrees();
  that.set("availableBTs", behaviorTrees);
}

function loadAgentsRdfGraphData() {
  let repo = (localStorage.currentStore || "http://localhost:8090/rdf4j/repositories")
    + globals.agentsRepository;
  actionsAgnt.getFromServer(ajax, repo)
    .then(setAvailableBehaviors)
    .then(setAvailableEvents)
    .then(setAvailableEndpoints);
}

function setAvailableBehaviors() {
  let behaviorsLists = actionsAgnt.getBehaviors();
  that.set("availableBehaviors", behaviorsLists.regular);
}

function setAvailableEvents() {
  let eventLists = actionsAgnt.getEvents();
  that.set("availableEvents", eventLists);
}

function setAvailableEndpoints() {
  let endpointList = actionsAgnt.getEndpoints();
  that.set("availableEndpoints", endpointList);
}

function generateAgent() {
  let agentRepo = (localStorage.currentStore || "http://localhost:8090/rdf4j/repositories/") + "agents";
  let selected = localStorage.getItem("bt-selected");
  let selectedBt = that.get("availableBTs").filter(item => item.uri == selected);
  console.log(selectedBt);
  let includedEvents = new Array();
  selectedBt[0].nodes.forEach(function (item) {
    addEventURI(item, includedEvents);
  });
  let includedBehaviors = getBehaviors(selectedBt[0], includedEvents);
  let includedEndpoints = getEndpoints(includedEvents);
  let agentDef = {};
  agentDef.event = actionsAgnt.createDefinedEvent(agentRepo, selectedBt[0], includedEvents);
  agentDef.behavior = actionsAgnt.createDefinedBehavior(agentRepo, selectedBt[0], includedEvents, includedBehaviors);
  agentDef.endpoint = actionsAgnt.createDefinedEndpoint(agentRepo, selectedBt[0], agentDef.event, includedEndpoints);
  agentDef.template = actionsAgnt.createDefinedAgent(agentRepo, selectedBt[0], includedEvents, includedBehaviors, includedEndpoints);
  console.log(agentDef);
  let stringRDF = actionsAgnt.createAgentRDFString(agentDef);
  saveGeneratedAgent(agentRepo, stringRDF);
}

function saveGeneratedAgent(repo, stringRDF) {
  try {
    actions.saveAgentGraph(globals.ajax, repo, stringRDF);
  } catch (e) {
    $("#error-message").trigger("showToast", [
      "Error while saving generated Agent"
    ]);
    throw e;
  }
}

function addEventURI(item, events) {
  let addableUri = "";
  if (item.category == "GoalProducer") {
    addableUri = getGoalURI(item.uri);
  } else if (item.category == "EventProducer" || item.category == "HandleMappingEvent" || item.category == "HandleEvent" || item.category == "HandleQueueEvent") {
    addableUri = getEventURI(item.uri);
  }
  if (addableUri != "" && !events.includes(addableUri)) {
    events.push(addableUri);
  }
}

function getGoalURI(uri) {
  return rdfGraph.getObject(uri, AGENTS.goal).value;
}

function getEventURI(uri) {
  return rdfGraph.getObject(uri, AGENTS.event).value;
}

function getBehaviors(bt, includedEvents) {
  let addableBehaviors = {};
  addableBehaviors = new Array();
  let behaviors = that.get("availableBehaviors");
  includedEvents.forEach(function (event) {
    behaviors.forEach(function (bhvs) {
      bhvs.triggers.forEach(function (item) {
        if (item.uri == event && !addableBehaviors.includes(event) && bhvs.bt.uri != bt.uri) {
          addableBehaviors.push(bhvs.uri);
        }
      })
    });
  });
  return addableBehaviors;
}

function getEndpoints(includedEvents) {
  let addableEndpoints = new Array();
  let endpoints = that.get("availableEndpoints");
  includedEvents.forEach(function (event) {
    endpoints.forEach(function (endpt) {
      endpt.events.forEach(function (item) {
        if (item.uri == event && !addableEndpoints.includes(event)) {
          addableEndpoints.push(endpt.uri);
        }
      })
    });
  });
  return addableEndpoints;
}

function createBT(bt) {
  that.get("availableBTs").push(bt);
  that.dataBus.save();
}

function cloneBT(label) {
  let selected = localStorage.getItem("bt-selected");
  let bts = that.get("availableBTs").filter(item => item.uri == selected);
  if (bts.length > 0) {
    console.log(bts[0]);
    let bt = rdfManager.cloneBT(bts[0].uri, that.get("availableBTs").filter(item => item.uri !== selected), bts[0].name + "_clone");
    that.dataBus.save(bt);
  }
}

function importBT(bt) {
  console.log("Import BT");
}

function exportBT() {
  let bt = {};
  let selected = localStorage.getItem("bt-selected");
  let bts = that.get("availableBTs").filter(item => item.uri == selected);
  if (bts.length > 0) {
    bt.label = bts[0].name;
    bt.uri = selected;
    bt.definition = rdfManager.exportBT(bts[0].uri, that.get("availableBTs").filter(item => item.uri !== selected));
  }
  return bt;
}

function deleteBT() {
  let selected = localStorage.getItem("bt-selected");
  let bts = that.get("availableBTs").filter(item => item.uri == selected);
  if (rdfManager.deleteBT(bts[0].uri, that.get("availableBTs").filter(item => item.uri !== selected), true)) {
    that.dataBus.save();
  }
}

function bindRequiredEvents() {
	events.cyAddEvent();
}

function bindEvents() {
	events.dragNode(cy);
	events.freeNode(cy);
	events.keyup(cy, ur);
	events.bindActionBar();
	events.clickNode(cy);
}

function setTriplestoreField() {
	$(".store-url").text(localStorage.currentStore);
}

function bindCyRefresh() {
	$("#behavior-tree").on("refresh", function() {
		loadRdfGraphData();
	});
}
