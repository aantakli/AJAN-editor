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
import {XSD, RDFS} from "ajan-editor/helpers/RDFServices/vocabulary";
import rdfGraph from "ajan-editor/helpers/RDFServices/RDF-graph";
import rdfManager from "ajan-editor/helpers/RDFServices/RDF-manager";
import rdfFact from "ajan-editor/helpers/RDFServices/RDF-factory";
import globals from "ajan-editor/helpers/global-parameters";
import actions from "ajan-editor/helpers/agents/actions";

import stringToStream from "npm:string-to-stream";
import N3Parser from "npm:rdf-parser-n3";
import rdf from "npm:rdf-ext";

let self;
let parser = new N3Parser();

export default Component.extend({
  dataBus: Ember.inject.service('data-bus'),
	overview: null,
	activeAgent: null,
  agentInitKnowledge: "",
  oldInitKnowledge: "",
  activeValue: null,
	selectedEndpoints: null,
	selectedEvents: null,
  selectedBehaviors: null,
  selectedInitBehavior: null,
  selectedFinalBehavior: null,
	JSnewcheckedPermissions:null,
  newVariable: "?",
  content: "",
  fileName: "",
  edit: "",

	init() {
	  this._super(...arguments);
	  self = this;
		reset();
	},

	didReceiveAttrs() {
		this._super(...arguments);
		self.set('selectedEvents',[]);
		self.set('selectedEndpoints',[]);
    self.set('selectedBehaviors', []);
    if (this.get("activeAgent") != null) {
      setFileContent(this.get("activeAgent.uri"));
      readAgentInitKnowledge();
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

    handleCheck(item) {
		  this.set('Selecteditems', item);
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
      setFileContent(self.get("activeAgent.uri"));
		},

    savenewinitbehavior(newbehavior) {
      rdfGraph.removeRelatedQuads(self.get("activeAgent.uri"), "http://www.ajan.de/ajan-ns#initialBehavior");
      if (newbehavior != null) {
        self.set("activeAgent.initialBehavior", self.get("availableBehaviors.initial").filter(item => item.uri == newbehavior)[0]);
        var rdftriple = rdfFact.quad(self.get("activeAgent.uri"), "http://www.ajan.de/ajan-ns#initialBehavior", newbehavior);
        rdfGraph.add(rdftriple);
      } else {
        self.set("activeAgent.initialBehavior", undefined);
      }
      updateRepo();
      reset();
      setFileContent(self.get("activeAgent.uri"));
      self.actions.toggle("initialBehavior");
    },

    savenewfinalbehavior(newbehavior) {
      rdfGraph.removeRelatedQuads(self.get("activeAgent.uri"), "http://www.ajan.de/ajan-ns#finalBehavior");
      if (newbehavior != null) {
        self.set("activeAgent.finalBehavior", self.get("availableBehaviors.final").filter(item => item.uri == newbehavior)[0]);
        var rdftriple = rdfFact.quad(self.get("activeAgent.uri"), "http://www.ajan.de/ajan-ns#finalBehavior", newbehavior);
        rdfGraph.add(rdftriple);
      } else {
        self.set("activeAgent.finalBehavior", undefined);
      }
      updateRepo();
      reset();
      setFileContent(self.get("activeAgent.uri"));
      self.actions.toggle("finalBehavior");
    },

    savenewbehaviors(newbehaviors) {
      rdfGraph.removeRelatedQuads(self.get("activeAgent.uri"), "http://www.ajan.de/ajan-ns#behavior");
      self.set("activeAgent.behaviors", newbehaviors);
      for (var i = 0; i < newbehaviors.length; i++){
			  var rdftriple = rdfFact.quad(self.get("activeAgent.uri") ,"http://www.ajan.de/ajan-ns#behavior", newbehaviors[i].uri);
			  rdfGraph.add(rdftriple);
      }
      updateRepo();
      reset();
      setFileContent(self.get("activeAgent.uri"));
		  self.actions.toggle("behavior");
    },

    savenewevents(newevents){
	    self.set("activeAgent.events",[]);
      rdfGraph.removeRelatedQuads(self.get("activeAgent.uri"), "http://www.ajan.de/ajan-ns#event");
	    for(var i=0;i<newevents.length;i++){
			self.get("activeAgent.events").push(newevents[i]);//totally new
			var rdftriple= rdfFact.quad(self.get("activeAgent.uri") ,"http://www.ajan.de/ajan-ns#event", newevents[i].uri);
			rdfGraph.add(rdftriple);
      }
      updateRepo();
      reset();
      setFileContent(self.get("activeAgent.uri"));
      self.actions.toggle("event");
    },

    savenewendpoints(newendpoints){
	    self.set("activeAgent.endpoints",[]);
      rdfGraph.removeRelatedQuads(self.get("activeAgent.uri"), "http://www.ajan.de/ajan-ns#endpoint");
	    for(var i=0;i<newendpoints.length;i++){
	      self.get("activeAgent.endpoints").push(newendpoints[i]);//totally new
        var rdftriple= rdfFact.quad(self.get("activeAgent.uri") ,"http://www.ajan.de/ajan-ns#endpoint", newendpoints[i].uri);
        rdfGraph.add(rdftriple);
      }
      updateRepo();
      reset();
      setFileContent(self.get("activeAgent.uri"));
      self.actions.toggle("endpoint");
    },

		deleteVariable(ele, val) {
			rdfManager.removeListItem(val.pointerUri);
			self.set("activeService.variables", ele.filter(item => item !== val));
			updateRepo();
		},

		deleteagent() {
			deleteActiveAgent()
			updateRepo();
			reset();
		},

		deletebehavior()  {
			deleteActiveBehavior()
			updateRepo();
			reset();
		},

		deleteevent() {
			deleteActiveEvent()
			updateRepo();
			reset();
		},

		deleteendpoint() {
			deleteActiveEndpoint()
			updateRepo();
			reset();
		},

		deletegoal() {
			deleteActiveGoal()
			updateRepo();
			reset();
		},

		cancel() {
			self.actions.toggle(self.edit);
			self.set("activeAgent." + self.edit, self.activeValue);
			reset();
    },

    saveKnowledge() {
      saveInitKnowledge();
    },

		toggle(key) {
			switch(key) {
				case "AGENT": self.toggleProperty('showAgent'); break;
        case "label": self.toggleProperty('editLabel'); break;

        case "initialBehavior":
          self.toggleProperty('editInitialBehavior');
          break;
        case "finalBehavior":
          self.toggleProperty('editFinalBehavior');
          break;
				case "behavior": 
					selectedBehaviors();
					self.toggleProperty('editBehavior');
					break;

				case "event":
					selectedEvents();
					self.toggleProperty('editEvent'); 
					break;

				case "endpoint": 
					selectedEndpoints();
					self.toggleProperty('editEndpoint'); 
          break;

        case "knowledge":
          toggleKnowledge();
          self.toggleProperty('editKnowledge');
          break;
				default:
					break;
			}
		}
	}
});

function deleteActiveAgent() {
  actions.deleteAgent(self.activeAgent);
  self.overview.set("availableAgents", self.overview.availableAgents.filter(item => item !== self.activeAgent));
  self.overview.actions.setActiveAgent(self.overview.availableAgents[0]);
}

function selectedBehaviors() {
  self.set('selectedBehaviors', []);
  var behaviors = new Array();
  var selected = self.get("activeAgent.behaviors");
	for (var i = 0; i < self.get("availableBehaviors.regular").length; i++) {
    for (var j = 0; j < selected.length; j++) {
      if (self.get("availableBehaviors.regular")[i].uri === selected[j].uri) {
        behaviors.push(self.get("availableBehaviors.regular")[i]);
			}
		}
  }
  self.set('selectedBehaviors', behaviors);
}

function selectedEvents() {
	self.set('selectedEvents',[]);
	var selected = self.get("activeAgent.events");
	for (var i = 0; i < self.availableEventsandGoals.length; i++) {
		for (var j = 0; j < selected.length; j++) {
			if (self.availableEventsandGoals[i].uri == selected[j].uri) {
				self.selectedEvents.push(self.availableEventsandGoals[i]);
			}
		}
	}
}

function selectedEndpoints() {
	self.set('selectedEndpoints',[]);
	var selected = self.get("activeAgent.endpoints");
	for (var i = 0; i < self.availableEndpoints.length; i++) {
		for (var j = 0; j < selected.length; j++) {
			if (self.availableEndpoints[i].uri == selected[j].uri) {
				self.selectedEndpoints.push(self.availableEndpoints[i]);
			}
		}
	}
}

function toggleKnowledge() {
  if (!self.get("editKnowledge")) {
    self.set("oldInitKnowledge", self.get("agentInitKnowledge"));
    console.log(self.get("editKnowledge"));
  } else {
    self.set("agentInitKnowledge", self.get("oldInitKnowledge"));
    $(".error-txt").text("");
  }
}

function updateRepo() {
	let repo = (localStorage.currentStore || "http://localhost:8090/rdf4j/repositories")
						+ globals.agentsRepository;
  actions.saveAgentGraph(globals.ajax, repo, self.dataBus);
}

function reset() {
  console.log("reset");
	self.activeValue = null;
	self.edit = "";
}

function setFileContent(uri) {
  let label = rdfGraph.getObject(uri, RDFS.label);
  let eventRDF = rdfGraph.getAllQuads(uri);
  self.set("fileName", "agents_agent_" + label.value + ".trig");
  self.set("content", URL.createObjectURL(new Blob([rdfGraph.toString(eventRDF)])));
}


function readAgentInitKnowledge() {
  if (self.get("activeAgent.initKnowledge")) {
    self.set("agentInitKnowledge", self.get("activeAgent.knowledgeData"));
  }
}

function saveInitKnowledge() {
  let deleteList = [];
  rdfGraph.forEach((quad) => {
    if (quad.graph.value == self.get("activeAgent.initKnowledge")) {
      deleteList.push(quad);
    }
  });

  let quadStream = parser.import(stringToStream(self.get("agentInitKnowledge")));
  rdf.dataset().import(quadStream).then((dataset) => {

    deleteList.forEach((quad) => {
      rdfGraph.remove(quad);
    });

    console.log(dataset);
    dataset.forEach((quad) => {
      quad.graph = rdf.namedNode(self.get("activeAgent.initKnowledge"));
      rdfGraph.add(quad);
    });
    updateRepo();
    reset();
    self.set("oldInitKnowledge", self.get("agentInitKnowledge"));
    self.actions.toggle("knowledge");
    $(".error-txt").text("");
  }).catch(function (error) {
    $(".error-txt").text("Content-type: 'text/turtle' expected! " + error);
  });
}
