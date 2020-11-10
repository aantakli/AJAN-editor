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
import {observer} from "@ember/object";
import Component from "@ember/component";
import rdfGraph from "ajan-editor/helpers/RDFServices/RDF-graph";
import globals from "ajan-editor/helpers/global-parameters";
import actionsACTN from "ajan-editor/helpers/services/actions";
import rdfFact from "ajan-editor/helpers/RDFServices/RDF-factory";

let ajax = null;
let that;

export default Component.extend({
  ajax: Ember.inject.service(),

  availableACTNs: null,
  selected: undefined,
  uri: null,

  init() {
    this._super(...arguments);
    that = this;
    initializeGlobals(this);
    loadActionsRdfGraphData();
  },

  selectedChanged: observer("selected", function () {
    this.set("selected", this.selected);
    setBase(this.get("uri"), this.get("structure.mapping"), this.selected);
  }),
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

function loadActionsRdfGraphData() {
  let repo = (localStorage.currentStore || "http://localhost:8090/rdf4j/repositories")
    + globals.servicesRepository;
  actionsACTN.getFromServer(ajax, repo).then(setAvailableActions);
}

function setAvailableActions() {
  let actionLists = actionsACTN.getActions();
  let allActions = actionLists.services.concat(actionLists.plugins);
  that.set("availableACTNs", allActions);
  var base = getSelected(that.get("availableACTNs"), that.get("value"));
  that.set("selectedBaseValue", base);
}

function getSelected(ele, uri) {
  return ele.find(item => item.uri === uri);
}

function setBase(uri, basePredicate, value) {
  rdfGraph.setObject(uri, basePredicate, rdfFact.toNode(value));
}
