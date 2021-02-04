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
import Ember from "ember";
import { sendFile } from "ajan-editor/helpers/RDFServices/ajax/query-rdf4j";
import globals from "ajan-editor/helpers/global-parameters";
import htmlGen from "ajan-editor/helpers/home/html-generator";
import agtActions from "ajan-editor/helpers/agents/actions";
import rdfGraph from "ajan-editor/helpers/RDFServices/RDF-graph";
import * as zip from "zip-js-webpack";

let $ = Ember.$;
let repoAgents;

class TriplestoreListing {
	constructor(triplestore, parentComponent) {
		this.triplestore = triplestore;
		this.parentComponent = parentComponent;
    zip.useWebWorkers = true;
    zip.workerScripts = null;
    zip.workerScriptsPath = ".";
		this.initiate();
	}

  initiate() {

		this.createFields();
		this.setAuxiliaryFields();
		this.attachFields();
		this.bindEvents();
	}

	createFields() {
		this.$wrapper = htmlGen.listingWrapper(this.triplestore);
		this.$label = htmlGen.divLabel(this.triplestore);
		this.$uri = htmlGen.divURI(this.triplestore);
		this.$buttons = htmlGen.buttons();
	}

	setAuxiliaryFields() {
		this.$parent = $("#triplestore-list");
		this.$removeButton = this.$buttons.children(".triplestore-remove");
    this.$editButton = this.$buttons.children(".triplestore-edit");
    this.$importButton = this.$buttons.children(".triplestore-import");
		this.$editButtonContent = this.$editButton.children();
	}

	attachFields() {
		this.$wrapper.append(this.$label, this.$uri, this.$buttons);
		this.$parent.append(this.$wrapper);
	}

	bindEvents() {
		this.bindTransitionEvent();
		this.bindRemoveTriplestoreEvent();
    this.bindEditClickEvent();
    this.bindImportClickEvent();
	}

	bindTransitionEvent() {
		this.$wrapper.off("click").click(event => this.transitionEvent(event));
	}

	transitionEvent(event) {
		let target = $(event.target);
		//TODO: return if div is in edit mode
		if (target.is("input")) return;
		localStorage.currentStore = this.$uri[0].innerText;
		this.parentComponent.sendAction("transitionToEditorBehavior");
	}

	bindRemoveTriplestoreEvent() {
		this.$removeButton.off("click").click(event => {
			event.stopPropagation();
			this.removeTriplestore();
		});
	}

	removeTriplestore() {
		this.removeStorageEntry();
		this.removeListing();
	}

	removeStorageEntry() {
		let {
			triplestores,
			triplestoreIndex
		} = this.findMatchingTriplestoreInStorage();
		if (triplestoreIndex > -1) triplestores.splice(triplestoreIndex, 1);
		localStorage.triplestores = JSON.stringify(triplestores);
	}

	removeListing() {
		this.$wrapper.remove();
	}

	bindEditClickEvent() {
		this.setInputFields();
		this.$editButton.off("click").click(event => this.editClickEvent(event));
	}

	setInputFields() {
		this.$inputLabel = htmlGen.inputLabel(this.triplestore);
		this.$inputURI = htmlGen.inputURI(this.triplestore);
	}

	editClickEvent(event) {
		event.stopPropagation();
		this.toggleEditButtonClasses();
		this.switchEditModeState();
	}

	switchEditModeState() {
		if (this.$editButtonContent.hasClass("check")) {
			this.enableEditMode();
		} else {
			this.disableEditMode();
		}
	}

	toggleEditButtonClasses() {
		this.$editButton.toggleClass("yellow positive");
		this.$editButtonContent.toggleClass("check setting");
	}

	enableEditMode() {
		this.setInputFields();
		this.$label.empty().append(this.$inputLabel);
		this.$uri.empty().append(this.$inputURI);
		this.bindInputEnter(this.$inputLabel);
		this.bindInputEnter(this.$inputURI);
	}

	bindInputEnter($input) {
		$input.keypress(e => {
			// Pressed Enter
			if (e.which == 13) this.editClickEvent(e);
		});
	}

	disableEditMode() {
		this.updateTriplestore();
		this.$label.empty().text(this.triplestore.label);
		this.$uri.empty().text(this.triplestore.uri);
	}

	updateTriplestore() {
		let newLabel = this.$inputLabel.val();
		let newUri = fixUri(this.$inputURI.val());
		if (this.triplestoreValuesChanged(newLabel, newUri)) {
			let {
				triplestores,
				triplestoreIndex
			} = this.findMatchingTriplestoreInStorage();
			this.updateThisTriplestore(newLabel, newUri);
			this.updateStorageTriplestore(triplestores, triplestoreIndex);
		}
	}

	triplestoreValuesChanged(newLabel, newUri) {
		return (
			newUri !== this.triplestore.uri || newLabel !== this.triplestore.label
		);
	}

	updateThisTriplestore(newLabel, newUri) {
		this.triplestore.uri = newUri;
		this.triplestore.label = newLabel;
	}

	findMatchingTriplestoreInStorage() {
		let triplestores = JSON.parse(localStorage.triplestores) || [];
		let triplestoreIndex = triplestores.findIndex(store => {
			return (
				store.label === this.triplestore.label &&
				store.uri === this.triplestore.uri
			);
		});
		if (triplestoreIndex < 0) console.warn("Could not find", this.triplestore);
		return {triplestores, triplestoreIndex};
	}

	updateStorageTriplestore(triplestores, triplestoreIndex) {
		triplestores[triplestoreIndex] = this.triplestore;
		localStorage.triplestores = JSON.stringify(triplestores);
  }

  bindImportClickEvent() {
    this.$importButton.on("change", (event) => {
      event.stopPropagation();
      let ajax = this.parentComponent.ajax;
      let triplestore = this.triplestore.uri;
      unzip(event.target.files[0], function (zipFile) {
        readInfoJSON(zipFile, triplestore, ajax, readAgentsTTL);
      });
    })
  }
}

function fixUri(uri) {
	let regexHttp = RegExp("^http://");
	let regexHttps = RegExp("^https://");
	return (regexHttp.test(uri) || regexHttps.test(uri)) ? uri : "http://" + uri;
}

function unzip(file, onEnd) {
  let zipFile = {
    info: { entry: null, import: null },
    agents: { entry: null, import: null },
    behaviors: { entry: null, import: null },
    domains: { entry: null, import: null },
    actions: { entry: null, import: null }
  };
  getEntries(file, function (entries) {
    entries.forEach(function (entry) {
      console.log(entry);
      switch (entry.filename) {
        case "WalkToBreakdown/info.json":
          zipFile.info.entry = entry;
          break;
        case "WalkToBreakdown/agents/agents.ttl":
          zipFile.agents.entry = entry;
          break;
        case "./behaviors/behaviors.ttl":
          zipFile.behaviors.entry = entry;
          break;
        default:
          console.log("none");
      }
    });
    onEnd(zipFile);
  });
}

function readInfoJSON(zipFile, triplestore, ajax, onEnd) {
  let writer = new zip.BlobWriter();
  zipFile.info.entry.getData(writer, function (blob) {
    let oFReader = new FileReader()
    oFReader.onloadend = function (e) {
      let content = JSON.parse(this.result);
      console.log(content);
      zipFile.info.input = content;
      onEnd(zipFile, triplestore, ajax);
    };
    oFReader.readAsText(blob);
  }, onprogress);
}

function readAgentsTTL(zipFile, triplestore, ajax) {
  let writer = new zip.BlobWriter();
  zipFile.agents.entry.getData(writer, function (blob) {
    let oFReader = new FileReader()
    oFReader.onloadend = function (e) {
      agtActions.readTTLInput(this.result, function (importFile) {
        zipFile.agents.import = importFile;
        loadRdfGraphData(zipFile, triplestore, ajax);
      });
    };
    oFReader.readAsText(blob);
  }, onprogress);
}

function getEntries(file, onend) {
  zip.createReader(new zip.BlobReader(file), function (zipReader) {
    zipReader.getEntries(onend);
  }, onerror);
}

function loadRdfGraphData(zipFile, triplestore, ajax) {
  let repo = (triplestore || "http://localhost:8090/rdf4j/repositories")
    + globals.agentsRepository;
  loadAgentRdfGraphData(ajax, repo, function () {
    let agentDefs = {
      templates: agtActions.getAgents(),
      behaviors: agtActions.getBehaviors(),
      endpoints: agtActions.getEndpoints(),
      events: agtActions.getEvents(),
      goals: agtActions.getGoals(),
    };
    let matches = agtActions.getAgentDefsMatches(agentDefs, zipFile.agents.import);
    if (matches.length > 0) {
      agtActions.createImportModal(matches, function () {
        rdfGraph.addAll(zipFile.agents.import.quads);
        agtActions.saveAgentGraph(ajax, repo, null);
      }, zipFile.info.input);
    } else {
      sendFile(repo, zipFile.agents.import.raw);
    }
  });
}

function loadAgentRdfGraphData(ajax, repo, onend) {
  agtActions.getAgentFromServer(ajax, repo).then(addRDFDataToGraph)
    .then(agtActions.getBehaviorsFromServer(ajax, repo).then(addRDFDataToGraph)
      .then(agtActions.getEventsFromServer(ajax, repo).then(addRDFDataToGraph)
        .then(agtActions.getEndpointsFromServer(ajax, repo).then(addRDFDataToGraph)
          .then(agtActions.getGoalsFromServer(ajax, repo).then(addRDFDataToGraph)
          .then(onend)))));
}

function addRDFDataToGraph(rdfData) {
  rdfGraph.set(rdfData);
}

export {TriplestoreListing};
