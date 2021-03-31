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
import { XSD, RDF, RDFS, SPIN, AGENTS} from "ajan-editor/helpers/RDFServices/vocabulary";
import rdfGraph from "ajan-editor/helpers/RDFServices/RDF-graph";
import rdfFact from "ajan-editor/helpers/RDFServices/RDF-factory";
import globals from "ajan-editor/helpers/global-parameters";
import actions from "ajan-editor/helpers/agents/actions";
import * as sparqljs from 'sparqljs';

let ajax = null;
let self;
let activeAgent;

export default Component.extend({
  dataBus: Ember.inject.service('data-bus'),
	overview: null,
	activeAgent: null,
	activeValue: null,
  newVariable: "?",
  content: "",
  fileName: "",
	edit: "",
  types: [{uri: RDFS.Resource, label: "rdfs:Resource"},
          {uri: XSD.string, label: "xsd:string"},
          {uri: XSD.int, label: "xsd:integer"},
          {uri: XSD.float, label: "xsd:float"},
          {uri: XSD.double, label: "xsd:double"},
          {uri: XSD.boolean, label: "xsd:boolean"},
          {uri: XSD.long, label: "xsd:long"},
    { uri: XSD.anyURI, label: "xsd:anyURI" }],

	init() {
	    this._super(...arguments);
	    self = this;
			reset();
  },

	didReceiveAttrs() {
    this._super(...arguments);
    if (this.get("activeGoal") != null) {
      setFileContent(this.get("activeGoal.uri"));
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
        let oldValue = undefined;
        if (Array.isArray(value)) {
          oldValue = copyArray(value);
        } else {
          oldValue = value;
        }
        self.activeValue = oldValue;
        self.edit = key;
        self.actions.toggle(key);
      }
    },

    save(s, p, o, type) {
		  if (p == "http://www.ajan.de/ajan-ns#condition") {
			  try {
			    var SparqlParser = sparqljs.Parser;
			    var parser = new SparqlParser();
			    var parsedQuery = parser.parse(o);
			    $(".sparql-edit").removeClass("error");
			    $(".error-txt").text("");
			  } catch (e) {
			    $(".sparql-edit").addClass("error");
			    $(".error-txt").text(e);
			    return;
			  }
      };
		  rdfGraph.setObjectValue(s, p, o, type = XSD.string);
			self.actions.toggle(self.edit);
			reset();
      updateRepo();
      setFileContent(self.get("activeGoal.uri"));
		},

    addVariable() {
      let newVar = newVariable();
      self.get("activeGoal.variables").addObject(newVar);
    },

    saveVariables() {
      self.get("activeGoal.variables").forEach(function (item, index, arr) {
        console.log(item);
        rdfGraph.setObjectValue(item.uri, SPIN.varName, item.varName);
        rdfGraph.setObject(item.uri, AGENTS.dataType, rdfFact.toNode(item.dataType));
      });
      self.actions.toggle(self.edit);
      reset();
      updateRepo();
      setFileContent(self.get("activeGoal.uri"));
    },

    deletegoalvariable(ele, val) {
      self.set("activeGoal.variables", actions.deleteVariable(ele, val));
      updateRepo();
      setFileContent(self.get("activeGoal.uri"));
		},

    deletegoal() {
      actions.deleteGoal(self.activeGoal);
      console.log(self.overview.get("availableGoals"));
      self.overview.set("availableGoals", self.overview.availableGoals.filter(item => item !== self.activeGoal));
      self.overview.actions.setActiveGoal(self.overview.availableGoals[0]);
      updateRepo();
      reset();
    },

		cancel() {
			self.actions.toggle(self.edit);
			self.set("activeGoal." + self.edit, self.activeValue);
			reset();
		},

		toggle(key) {
			switch(key) {
        case "label": self.toggleProperty('editGoalLabel'); break;
        case "condition": self.toggleProperty('editGoalCondition'); break;
        case "variables": self.toggleProperty('editGoalVariables'); break;
				default: break;
			}
		}
	}
});

function copyArray(value) {
  let oldValue = new Array();
  value.forEach(function (item, index, arr) {
    oldValue.push({ uri: item.uri, pointerUri: item.pointerUri, varName: item.varName, dataType: item.dataType });
  });
  return oldValue;
}

function newVariable() {
  let variable = {};
	let resource = rdfFact.blankNode();
  variable.uri = resource.value;
  variable.varName = "";
  variable.dataType = XSD.string;
	actions.createVariable(resource, variable);
	actions.appendVariable(resource, variable, self.activeGoal.variables);
	return variable;
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
  let eventRDF = actions.exportGoal(uri);
  self.set("fileName", "agents_goals_" + label.value + ".ttl");
  self.set("content", URL.createObjectURL(new Blob([rdfGraph.toString(eventRDF) + "."])));
}


