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
import {observer} from "@ember/object";
import Component from "@ember/component";
import rdfGraph from "ajan-editor/helpers/RDFServices/RDF-graph";
import globals from "ajan-editor/helpers/global-parameters";
import actionsAgnt from "ajan-editor/helpers/agents/actions";
import rdfFact from "ajan-editor/helpers/RDFServices/RDF-factory";

let ajax = null;
let that;

export default Component.extend({
  ajax: Ember.inject.service(),
  nodeProperties: Ember.inject.service("behaviors/node-properties"),
  availableEventsGoals: null,
  selected: undefined,
  validation: undefined,
  uri: null,

  init() {
    this._super(...arguments);
    that = this;
    initializeGlobals(this);
    initErrorsList(this);
    loadAvailableEventsRdfGraphData();
  },

  didInsertElement() {
    
  },

  didUpdateAttrs() {
    initErrorsList(this);
    validateEventGoalField(this);
  },

  selectedChanged: observer("selected", function () {
    this.set("selected", this.selected);
    setBase(this.get("uri"), this.get("structure.mapping"), this.selected);
    let base = getSelected(that.get("availableEventsGoals"), this.selected);
    this.set("selectedBaseValue", base);
    initErrorsList(this);
    validateEventGoalField(this);
  }),

  uriChange: observer("uri", function () {
    that = this;
    setAvailableEvents();
  })
});

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

function loadAvailableEventsRdfGraphData() {
  let repo = (localStorage.currentStore || "http://localhost:8090/rdf4j/repositories")
    + globals.agentsRepository;
  actionsAgnt.getFromServer(ajax, repo).then(setAvailableEvents);
}

function setAvailableEvents() {
  let eventLists = [];
  eventLists.push({ uri: "http://www.ajan.de/ajan-ns#All", label: "AJAN:All" });
  eventLists = eventLists.concat(actionsAgnt.getEvents());
  eventLists = eventLists.concat(actionsAgnt.getGoals());
  that.set("availableEventsGoals", eventLists);
  let base = getSelected(that.get("availableEventsGoals"), that.get("value"));
  that.set("selectedBaseValue", base);
  validateEventGoalField(that);
}

function getSelected(ele, uri) {
  return ele.find(item => item.uri === uri);
}

function setBase(uri, basePredicate, value) {
  rdfGraph.setObject(uri, basePredicate, rdfFact.toNode(value));
}

function initErrorsList(comp) {
  let node = getNode(comp);
  if (node && !node.errors) {
    getNode(comp).errors = new Array();
  }
}

function validateEventGoalField(comp) {
  if (!that.get("selected") && comp.get("value") == 'undefined') {
    let error = "No Event/Goal is selected!";
    comp.set("validation", error);
    comp.get("nodeProperties").updateErrorVisulization(comp, true);
  } else {
    comp.get("nodeProperties").updateErrorVisulization(comp, false);
    comp.set("validation", undefined);
  }
}

function getNode(comp) {
  return comp.get("nodeProperties").getNode(comp);
}
