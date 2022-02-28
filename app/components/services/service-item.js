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
import Component from '@ember/component';
import { ACTN, RDF, RDFS, HTTP } from "ajan-editor/helpers/RDFServices/vocabulary";
import rdfGraph from "ajan-editor/helpers/RDFServices/RDF-graph";
import rdfManager from "ajan-editor/helpers/RDFServices/RDF-manager";
import rdfFact from "ajan-editor/helpers/RDFServices/RDF-factory";
import globals from "ajan-editor/helpers/global-parameters";
import actions from "ajan-editor/helpers/services/actions";

import * as sparqljs from 'sparqljs';

let ajax = null;
let self;
let activeAction;

export default Component.extend({
  dataBus: Ember.inject.service('data-bus'),
	overview: null,
	activeAction: null,
	activeValue: null,
  newVariable: "?",
  content: "",
  fileName: "",
  edit: "",
  abort: false,
	communication: [{uri: ACTN.Synchronous, label: "Synchronous"}, {uri: ACTN.Asynchronous, label: "Asynchronous"}],
	methods: [{uri: HTTP.Get, label: "GET"}, {uri: HTTP.Post, label: "POST"}, {uri: HTTP.Put, label: "PUT"},{uri: HTTP.Patch, label: "PATCH"},
    				{uri: HTTP.Delete, label: "DELETE"},{uri: HTTP.Copy, label: "COPY"},{uri: HTTP.Head, label: "HEAD"},{uri: HTTP.Options, label: "OPTIONS"},
    				{uri: HTTP.Link, label: "LINK"},{uri: HTTP.Unlink, label: "UNLINK"},{uri: HTTP.Purge, label: "PURGE"},{uri: HTTP.Lock, label: "LOCK"},
    				{uri: HTTP.Unlock, label: "UNLOCK"},{uri: HTTP.Propfind, label: "PROPFIND"},{uri: HTTP.View, label: "VIEW"}],
  versions: [{ ver: "1.0" }, { ver: "1.1" }],

	init() {
	  this._super(...arguments);
	  self = this;
    reset();
    if (self.activeAction.communication === "Synchronous") {
      self.set("abort", false);
    }
    else {
      self.set("abort", true);
    }
  },

	didReceiveAttrs() {
		this._super(...arguments);
    if (this.activeAction != null) {
      console.log(self.activeAction.communication);
      if (self.activeAction.communication === "Synchronous") {
        self.set("abort", false);
      }
			else {
        self.set("abort", true);
      }
      if (this.get("activeAction") != null) {
        setFileContent(this.get("activeAction.uri"));
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

		edit(key, value) {
			if (!self.edit) {
				self.activeValue = value;
				self.edit = key;
				self.actions.toggle(key);
			}
		},

		activate(item) {
			$("#item-bindings .active").removeClass("active");
			if(item == "run") {
				$(".item-run-binding").addClass("active");
			} else {
				$(".item-abort-binding").addClass("active");
			}
		},

    save(s, p, o, type) {
      console.log(s);
      if (p == "http://www.ajan.de/actn#sparql" || p == "http://www.ajan.de/actn#headers") {
				try {
				  var SparqlParser = sparqljs.Parser;
				  var parser = new SparqlParser();
				  var parsedQuery = parser.parse(o);
				  console.log(parsedQuery);
				  $(".sparql-edit").removeClass("error");
				  $(".error-txt").text("");
				} catch (e) {
				  console.log(e);
				  $(".sparql-edit").addClass("error");
				  $(".error-txt").text(e);
				  return;
				}
			}

      if (o == ACTN.Synchronous) {
				self.set("activeAction." + self.edit, "Synchronous");
				if(self.activeAction.abort != null) {
					deleteAbortBinding();
				}
			}
			else if (o == ACTN.Asynchronous) {
				self.set("activeAction." + self.edit, "Asynchronous");
				if(self.activeAction.abort == null) {
					createAbortBinding();
				}
			}

			if (o == HTTP.Post)
				self.set("activeAction." + self.edit, "POST");
			else if (o == HTTP.Put)
				self.set("activeAction." + self.edit, "PUT");
			else if (o == HTTP.Get)
				self.set("activeAction." + self.edit, "GET");
			else if (o == HTTP.Patch)
				self.set("activeAction." + self.edit, "PATCH");
			else if (o == HTTP.Delete)
				self.set("activeAction." + self.edit, "DELETE");
			else if (o == HTTP.Copy)
				self.set("activeAction." + self.edit, "Copy");
			else if (o == HTTP.Head)
				self.set("activeAction." + self.edit, "HEAD");
			else if (o == HTTP.Options)
				self.set("activeAction." + self.edit, "OPTIONS");
			else if (o == HTTP.Link)
				self.set("activeAction." + self.edit, "LINK");
			else if (o == HTTP.Unlink)
				self.set("activeAction." + self.edit, "UNLINK");
			else if (o == HTTP.Purge)
				self.set("activeAction." + self.edit, "PURGE");
			else if (o == HTTP.Lock)
				self.set("activeAction." + self.edit, "LOCK");
			else if (o == HTTP.Unlock)
				self.set("activeAction." + self.edit, "UNLOCK");
			else if (o == HTTP.Propfind)
				self.set("activeAction." + self.edit, "PROPFIND");
			else if (o == HTTP.View)
				self.set("activeAction." + self.edit, "VIEW");

      rdfGraph.setObjectValue(s, p, o, type);
			self.actions.toggle(self.edit);
			reset();
      self.actions.updateRepo();
		},

    saveVariable(val) {
      if (!self.get("activeAction.variables")) {
        self.set("activeAction.variables", new Array());
      }
      let newVar = addNewVariable(val, self.get("activeAction.uri"));
      self.get("activeAction.variables").addObject(newVar);
			self.actions.toggle("variables");
			self.set(self.newVariable, "?");
      self.actions.updateRepo();
			reset();
		},

		deleteVariable(ele, val) {
			rdfManager.removeListItem(val.pointerUri);
			self.set("activeAction.variables", ele.filter(item => item !== val));
      self.actions.updateRepo();
		},

		delete() {
      deleteactiveAction();
      self.actions.updateRepo();
			reset();
		},

		cancel() {
			self.actions.toggle(self.edit);
			console.log(self.get("activeAction"));
			reset();
    },

    updateRepo() {
      let repo = (localStorage.currentStore || "http://localhost:8090/rdf4j/repositories")
        + globals.servicesRepository;
      actions.saveGraph(globals.ajax, repo, self.dataBus, "updated");
      setFileContent(self.get("activeAction.uri"));
    },

		toggle(key) {
			switch(key) {
				case "label": self.toggleProperty('editLabel'); break;
				case "communication": self.toggleProperty('editCommunication'); break;
				case "variables": self.toggleProperty('addVariable'); break;
				case "consumes.sparql": self.toggleProperty('editConsumes'); break;
				case "produces.sparql": self.toggleProperty('editProduces'); break;
				case "run.mthd": self.toggleProperty('editRunMthd'); break;
				case "run.version": self.toggleProperty('editRunVersion'); break;
        case "run.requestUri": self.toggleProperty('editRunURI'); break;
        case "run.accept": self.toggleProperty('editRunAccept'); break;
        case "run.contentType": self.toggleProperty('editRunContentType'); break;
        case "run.actnHeaders": self.toggleProperty('editRunAddHeaders'); break;
				case "run.payload.sparql": self.toggleProperty('editRunPayload'); break;
				case "abort.mthd": self.toggleProperty('editAbortMthd'); break;
				case "abort.version": self.toggleProperty('editAbortVersion'); break;
        case "abort.requestUri": self.toggleProperty('editAbortURI'); break;
        case "abort.accept": self.toggleProperty('editAbortAccept'); break;
        case "abort.contentType": self.toggleProperty('editAbortContentType'); break;
        case "abort.actnHeaders": self.toggleProperty('editAbortAddHeaders'); break;
				case "abort.payload.sparql": self.toggleProperty('editAbortPayload'); break;

				default:
					break;
			}
		}
	}
});

function deleteactiveAction() {
  actions.deleteService(self.overview.activeAction);
  self.overview.set("availableServices", self.overview.availableServices.filter(item => item !== self.activeAction));
  self.overview.actions.setActiveService(self.overview.availableServices[0]);
}

function createAbortBinding() {
  let repo = (localStorage.currentStore || "http://localhost:8090/rdf4j/repositories");
  let binding = actions.createDefaultBinding(repo);
	self.activeAction.abort = binding;
  self.set("abort", true);
	self.rerender();
	createRDFAbortBinding(binding);
}

function createRDFAbortBinding(binding) {
  actions.createBinding("abort", self.activeAction.uri, binding);
  window.location.reload();
}

function deleteAbortBinding() {
	actions.deleteBinding(self.activeAction.abort);
	delete self.activeAction.abort;
	self.actions.activate("run");
  self.set("abort", false);
}

function addNewVariable(val, root) {
	let variable = {}
	let resource = rdfFact.blankNode();
	variable.var = val.replace("?","");
	variable.uri = resource.value;
	actions.createVariable(resource, variable);
  actions.appendVariable(root, resource, variable, self.activeAction.variables);
	return variable;
}

function reset() {
	self.activeValue = null;
	self.actions.activate("run");
	self.edit = "";
}

function setFileContent(uri) {
  let label = rdfGraph.getObject(uri, RDFS.label);
  let eventRDF = exportService(uri);
  self.set("fileName", "actions_service_" + label.value + ".ttl");
  self.set("content", URL.createObjectURL(new Blob([rdfGraph.toString(eventRDF) + "."])));
}

function exportService(nodeURI) {
  let service = new Array();
  let nodes = new Array();
  visitNode(nodeURI, nodes);
  nodes.forEach(uri => {
    let quads = rdfGraph.getAllQuads(uri);
    quads.forEach(quad => {
      service.push(quad);
    })
  });
  return service;
}

function visitNode(uri, nodes) {
  rdfGraph.forEach(quad => {
    if (quad.subject.value === uri) {
      if (quad.object.value !== RDF.nil && quad.predicate.value !== RDF.type) {
        let child = quad.object.value;
        if (!nodes.includes(uri))
          nodes.push(uri);
        visitNode(child, nodes);
      }
    }
  });
}
