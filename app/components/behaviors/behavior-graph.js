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
import {cleanDOM} from "ajan-editor/helpers/graph/cy-cleanup";
import Ember from "ember";
import events from "ajan-editor/helpers/behaviors/event-bindings";
import globals from "ajan-editor/helpers/global-parameters";
import nodeDefs from "ajan-editor/helpers/RDFServices/node-definitions/common";
import rdfGraph from "ajan-editor/helpers/RDFServices/RDF-graph";
import rdfManager from "ajan-editor/helpers/RDFServices/RDF-manager";
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
  cyRef: undefined,

  init() {
    this._super(...arguments);
    that = this;
    this.get('dataBus').on('addBT', function (bt) {
      createBT(bt);
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
	nodeDefs(ajax, cy).then(loadRdfGraphData);
}

function loadRdfGraphData() {
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
