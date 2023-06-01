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
import rdfFact from "ajan-editor/helpers/RDFServices/RDF-factory";
import globals from "ajan-editor/helpers/global-parameters";
import actions from "ajan-editor/helpers/agents/actions";

let ajax = null;
let self;
let activeAgent;

export default Component.extend({
  dataBus: Ember.inject.service('data-bus'),
	overview: null,
	activeAgent: null,
  activeValue: null,
  regularBehavior: null,
	activeBT: null,
	selectedTriggers: null,
  newVariable: "?",
  oldType: "",
  content: "",
  fileName: "",
  edit: "",
  clearOpt: ["true", "false"],

	init() {
	    this._super(...arguments);
	    self = this;
		reset();
	},

	didReceiveAttrs() {
		this._super(...arguments);
    self.set('selectedTriggers', []);
    if (this.get("activeBehavior") != null) {
      setFileContent(this.get("activeBehavior.uri"));
    }
	},

	actions: {
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
      if (p == "http://www.ajan.de/ajan-ns#bt") {
        var bt = self.availableBTs.filter(item => item.uri == o);
				self.set("activeBehavior.bt.label", bt[0].name);
        self.set("activeBehavior.bt.uri", o);
        rdfGraph.setObject(s, p, rdfFact.toNode(o));
        self.actions.update();
        return;
      }
      if (p == "http://www.w3.org/1999/02/22-rdf-syntax-ns#type") {
        if (self.get("oldType") == "") {
          rdfGraph.add(rdfFact.quad(s, p, o));
        }
        else {
          let oldQuad = rdfGraph.findQuad(s, p, self.get("oldType"));
          rdfGraph.remove(oldQuad);
          if (o !== "") {
            oldQuad.object.value = o;
            rdfGraph.add(oldQuad);
          }
        }
        self.actions.update();
        return;
      }
      rdfGraph.setObjectValue(s, p, o, type = XSD.string);
      self.actions.update();
    },

    update() {
      self.actions.toggle(self.edit);
      reset();
      updateRepo();
      setFileContent(self.get("activeBehavior.uri"));
    },

		savenewtriggers(newtriggers){
			self.set("activeBehavior.triggers",[]);
      rdfGraph.removeRelatedQuads(self.get("activeBehavior.uri"), "http://www.ajan.de/ajan-ns#trigger");
			for(var i=0;i<newtriggers.length;i++){
				self.get("activeBehavior.triggers").push(newtriggers[i]);
				var rdftriple= rdfFact.quad(self.get("activeBehavior.uri") ,"http://www.ajan.de/ajan-ns#trigger", newtriggers[i].uri);
				rdfGraph.add(rdftriple);
      }
      updateRepo();
      reset();
      setFileContent(self.get("activeBehavior.uri"));
			self.actions.toggle("trigger");
		},

		deletebehavior()  {
      deleteActiveBehavior();
			updateRepo();
			reset();
		},

		cancel() {
			self.actions.toggle(self.edit);
			self.set("activeBehavior." + self.edit, self.activeValue);
			reset();
		},

		toggle(key) {
			switch(key) {
        case "label": self.toggleProperty('editLabel'); break;
        case "addtype":
          self.set("oldType", self.get("activeBehavior.addtype")); 
          self.toggleProperty('editAddtype');
          break;
        case "requires": self.toggleProperty('editRequires'); break;
				case "trigger":
				    selectedTriggers();
				    self.toggleProperty('editTrigger');
				    break;
        case "bt":
					listBTs();
					self.toggleProperty('editBt'); 
          break;
        case "clearEKB": self.toggleProperty('editClearEKB'); break;
				default:
					break;
			}
		}
	}
});

function selectedTriggers() {
	self.set('selectedTriggers',[]);
	var selected = self.get("activeBehavior.triggers");
	for (var i = 0; i < self.availableEventsandGoals.length; i++) {
		for (var j = 0; j < selected.length; j++) {
			if (self.availableEventsandGoals[i].uri == selected[j].uri) {
				self.selectedTriggers.push(self.availableEventsandGoals[i]);
			}
		}
	}
}

function listBTs() {
  if (self.activeBehavior.bt === undefined) {
    let bt = {label: "", uri: ""};
    self.set('activeBehavior.bt', bt);
  }
  self.set('activeBT', self.availableBTs.filter(item => item.uri == self.activeBehavior.bt.uri));
	console.log(self.get("activeBT"));
	console.log("availableBTs");
	console.log(self.get("availableBTs"));
}

function deleteActiveBehavior() {
  actions.deleteBehavior(self.activeBehavior);
  if (self.activeBehavior.type === AGENTS.InitialBehavior) {
    self.overview.set("availableBehaviors.initial", self.overview.availableBehaviors.initial.filter(item => item !== self.activeBehavior));
    self.overview.actions.setActiveBehavior(self.overview.availableBehaviors.initial[0],"initial");
  } else if (self.activeBehavior.type === AGENTS.FinalBehavior) {
    self.overview.set("availableBehaviors.final", self.overview.availableBehaviors.final.filter(item => item !== self.activeBehavior));
    self.overview.actions.setActiveBehavior(self.overview.availableBehaviors.final[0],"final");
  } else {
    self.overview.set("availableBehaviors.regular", self.overview.availableBehaviors.regular.filter(item => item !== self.activeBehavior));
    self.overview.actions.setActiveBehavior(self.overview.availableBehaviors.regular[0],"regular");
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

function setFileContent(uri) {
  let label = rdfGraph.getObject(uri, RDFS.label);
  let eventRDF = rdfGraph.getAllQuads(uri);
  self.set("fileName", "agents_behaviors_" + label.value + ".trig");
  self.set("content", URL.createObjectURL(new Blob([rdfGraph.toString(eventRDF)])));
}

