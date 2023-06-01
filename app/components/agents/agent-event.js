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
import {XSD, RDFS, AGENTS} from "ajan-editor/helpers/RDFServices/vocabulary";
import rdfGraph from "ajan-editor/helpers/RDFServices/RDF-graph";
import globals from "ajan-editor/helpers/global-parameters";
import actions from "ajan-editor/helpers/agents/actions";

let self;

export default Component.extend({
  dataBus: Ember.inject.service('data-bus'),
	overview: null,
	activeAgent: null,
	activeValue: null,
  newVariable: "?",
  content: "",
  fileName: "",
  edit: "",
  types: [
    { uri: AGENTS.Event, label: "Event" },
    { uri: AGENTS.QueueEvent, label: "Queue Event" },
    { uri: AGENTS.MappingEvent, label: "MappingEvent" },
  ],
	init() {
	  this._super(...arguments);
	  self = this;
    reset();
  },

	didReceiveAttrs() {
    this._super(...arguments);
    if (this.activeEvent != null) {
      if (self.activeEvent.type === "Synchronous") {
        self.set("abort", false);
      }
      else {
        self.set("abort", true);
      }
      if (this.get("activeEvent") != null) {
        setFileContent(this.get("activeEvent.uri"));
      }
    }
	},

  actions: {
    clipboarCopy(content) {
      let textArea = document.createElement("textarea");
      textArea.value = content;
      textArea.style.top = "0";
      textArea.style.left = "0";
      textArea.style.position = "fixed";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      document.execCommand("copy");
      try {
        var successful = document.execCommand('copy');
        var msg = successful ? 'successful' : 'unsuccessful';
        console.log('Fallback: Copying text command was ' + msg);
      } catch (err) {
        console.error('Fallback: Oops, unable to copy', err);
      }
      document.body.removeChild(textArea);
    },

	  handleCheck(items) {
      this.set('checkedPermissions', items);
    },

    edit(key, value) {
      if (!self.edit) {
        self.activeValue = value;
        self.edit = key;
        self.actions.toggle(key);
      }
    },

    save(s, p, o, type) {
      if (o == AGENTS.Event) {
        self.set("activeEvent." + self.edit, "Event");
      }
      else if (o == AGENTS.QueueEvent) {
        self.set("activeEvent." + self.edit, "QueueEvent");
      }
		  rdfGraph.setObjectValue(s, p, o, type = XSD.string);
			self.actions.toggle(self.edit);
			reset();
      updateRepo();
      setFileContent(self.get("activeEvent.uri"));
		},

		deleteevent() {
			deleteActiveEvent()
			updateRepo();
			reset();
		},

		cancel() {
			self.actions.toggle(self.edit);
			self.set("activeEvent." + self.edit, self.activeValue);
			reset();
		},

		toggle(key) {
      switch (key) {
        case "type": self.toggleProperty('editType'); break;
				case "label": self.toggleProperty('editLabel'); break;
				default: break;
			}
		}
	}
});

function deleteActiveEvent() {
	actions.deleteEvent(self.activeEvent);
	self.overview.set("availableEvents", self.overview.availableEvents.filter(item => item !== self.activeEvent));
	self.overview.actions.setActiveEvent(self.overview.availableEvents[0]);
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

function setFileContent(uri) {
  let label = rdfGraph.getObject(uri, RDFS.label);
  let eventRDF = rdfGraph.getAllQuads(uri);
  self.set("fileName", "agents_events_" + label.value + ".trig");
  self.set("content", URL.createObjectURL(new Blob([rdfGraph.toString(eventRDF)])));
}

