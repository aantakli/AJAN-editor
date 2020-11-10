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

import Component from '@ember/component';
import {XSD} from "ajan-editor/helpers/RDFServices/vocabulary";
import rdfGraph from "ajan-editor/helpers/RDFServices/RDF-graph";
import rdfFact from "ajan-editor/helpers/RDFServices/RDF-factory";
import globals from "ajan-editor/helpers/global-parameters";
import actions from "ajan-editor/helpers/agents/actions";

let ajax = null;
let self;
let activeAgent;

export default Component.extend({
	overview: null,
	activeAgent: null,
	activeValue: null,
	selectedConnectedEvents:null,
  newVariable: "?",
  dataBus: Ember.inject.service('data-bus'),
	edit: "",
	init() {
	    this._super(...arguments);
	    self = this;
			reset();
	},
	didReceiveAttrs() {
		this._super(...arguments);
		self.set('selectedConnectedEvents',[]);
	},

  actions: {
		handleCheck(items) {
			this.set('Selecteditems', items);
		},
		
		edit(key, value) {
			if (!self.edit) {
				self.activeValue = value;
				self.edit = key;
				self.actions.toggle(key);
			}
		},

    save(s, p, o, type) {
		    rdfGraph.setObjectValue(s, p, o, type = XSD.string);
			  self.actions.toggle(self.edit);
			  reset();
			  updateRepo();
		},

    /////////////////////////////////for Individual Endpoint ///////////////////////////////////////////////

    savenewendpointevents(newendpointevents){
	    self.set("activeEndpoint.events",[]);
	    actions.deleteactiveEndpointsevent(self.get("activeEndpoint"));
	    for(var i=0;i<newendpointevents.length;i++){
	      self.get("activeEndpoint.events").push(newendpointevents[i]);//totally new
        var rdftriple= rdfFact.quad(self.get("activeEndpoint.uri") ,"http://www.ajan.de/ajan-ns#event", newendpointevents[i].uri);
        rdfGraph.add(rdftriple);
			  updateRepo();
			  reset();
	    }
      self.actions.toggle("endpointevent");
 },

    deleteendpoint() {
        deleteActiveEndpoint()
        updateRepo();
        reset();
    },

		cancel() {
			self.actions.toggle(self.edit);
			self.set("activeEndpoint." + self.edit, self.activeValue);
			reset();
		},

		toggle(key) {
			switch(key) {
        case "endpointlabel": self.toggleProperty('editEndpointLabel'); break;
        case "endpointevent":
              selectedConnectedEvents();
              self.toggleProperty('editEndpointEvent');
              break;
        case "capability": self.toggleProperty('editCapability'); break;

				default:
					break;
			}
		}
	}
});


function deleteActiveEndpoint() {
	actions.deleteEndpoint(self.activeEndpoint);
	self.overview.set("availableEndpoints", self.overview.availableEndpoints.filter(item => item !== self.activeEndpoint));
	self.overview.actions.setActiveEndpoint(self.overview.availableEndpoints[0]);
}

function selectedConnectedEvents() {
	self.set('selectedConnectedEvents',[]);
	var selected = self.get("activeEndpoint.events");
	for (var i = 0; i < self.availableEventsandGoals.length; i++) {
		for (var j = 0; j < selected.length; j++) {
			if (self.availableEventsandGoals[i].uri == selected[j].uri) {
				self.selectedConnectedEvents.push(self.availableEventsandGoals[i]);
			}
		}
	}
}

function updateRepo() {
	let repo = (localStorage.currentStore || "http://localhost:8090/rdf4j/repositories")
						+ globals.agentsRepository;
	actions.saveAgentGraph(globals.ajax, repo, self.dataBus);
}

function reset() {
	self.activeValue = null;
	self.edit = "";
}

