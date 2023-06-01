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
import nodeDefs from "ajan-editor/helpers/RDFServices/node-definitions/common";
import globals from "ajan-editor/helpers/global-parameters";
import htmlGen from "ajan-editor/helpers/home/html-generator";
import agtActions from "ajan-editor/helpers/agents/actions";
import btActions from "ajan-editor/helpers/behaviors/actions";
import importModal from "ajan-editor/helpers/ui/import-modal";
import exportModal from "ajan-editor/helpers/ui/export-modal";
import rdfGraph from "ajan-editor/helpers/RDFServices/RDF-graph";
import * as zip from "zip-js-webpack";

let $ = Ember.$;
let that = null;

class TriplestoreListing {
	constructor(triplestore, parentComponent) {
		this.triplestore = triplestore;
    this.parentComponent = parentComponent;
    that = this;
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
    this.$secured = htmlGen.divSecured(this.triplestore);
		this.$uri = htmlGen.divURI(this.triplestore);
		this.$buttons = htmlGen.buttons();
	}

	setAuxiliaryFields() {
		this.$parent = $("#triplestore-list");
		this.$removeButton = this.$buttons.children(".triplestore-remove");
    this.$editButton = this.$buttons.children(".triplestore-edit");
    this.$importButton = this.$buttons.children(".triplestore-import");
    this.$exportButton = this.$buttons.children(".triplestore-export");
		this.$editButtonContent = this.$editButton.children();
	}

	attachFields() {
		this.$wrapper.append(this.$label, this.$uri, this.$secured, this.$buttons);
		this.$parent.append(this.$wrapper);
	}

	bindEvents() {
		this.bindTransitionEvent();
		this.bindRemoveTriplestoreEvent();
    this.bindEditClickEvent();
    this.bindImportClickEvent();
    this.bindExportClickEvent();
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
    this.$inputSecured = htmlGen.inputSecured(this.triplestore);
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
    this.$secured.empty().append(this.$inputSecured);
		this.$uri.empty().append(this.$inputURI);
    this.bindInputEnter(this.$inputLabel);
    this.bindInputEnter(this.$inputSecured);
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

    if (this.triplestore.secured) {
      this.$secured.empty().append("<i class='key icon'>");
    } else {
      this.$secured.empty();
    }
		this.$uri.empty().text(this.triplestore.uri);
	}

	updateTriplestore() {
    let newLabel = this.$inputLabel.val();
    let newSecured = this.$inputSecured[1].checked;
		let newUri = fixUri(this.$inputURI.val());
    if (this.triplestoreValuesChanged(newLabel, newSecured, newUri)) {
			let {
				triplestores,
				triplestoreIndex
			} = this.findMatchingTriplestoreInStorage();
      this.updateThisTriplestore(newLabel, newSecured, newUri);
			this.updateStorageTriplestore(triplestores, triplestoreIndex);
		}
	}

	triplestoreValuesChanged(newLabel, newSecured, newUri) {
		return (
      newUri !== this.triplestore.uri || newSecured !== this.triplestore.secured || newLabel !== this.triplestore.label
		);
	}

  updateThisTriplestore(newLabel, newSecured, newUri) {
    this.triplestore.uri = newUri;
    this.triplestore.secured = newSecured;
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

  bindExportClickEvent() {
    this.$exportButton.off("click").click(event => {
      event.stopPropagation();
      console.log("Export");
      let ajax = this.parentComponent.ajax;
      let triplestore = this.triplestore.uri;
      loadRdfGraphData(triplestore, ajax);
    });
  }

  bindImportClickEvent() {
    this.$importButton.on("change", (event) => {
      event.stopPropagation();
      let ajax = this.parentComponent.ajax;
      let triplestore = this.triplestore.uri;
      let file = event.target.files[0];
      event.target.value = '';
      unzip(file, function (zipFile) {
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
    agents: { entry: null, import: null, original: { rdf: null, defs: null } },
    behaviors: { entry: null, import: null, original: { rdf: null, defs: null } },
    domains: { entry: null, import: null, original: { rdf: null, defs: null } },
    actions: { entry: null, import: null, original: { rdf: null, defs: null } }
  };
  getEntries(file, function (entries) {
    entries.forEach(function (entry) {
      if (entry.filename.includes("info.json"))
        zipFile.info.entry = entry;
      else if (entry.filename.includes("agents/agents.ttl"))
        zipFile.agents.entry = entry;
      else if (entry.filename.includes("behaviors/behaviors.ttl"))
        zipFile.behaviors.entry = entry;
      else
        console.log("none");
    });
    onEnd(zipFile);
  });
}

function readInfoJSON(zipFile, triplestore, ajax, onEnd) {
  let writer = new zip.BlobWriter();
  zipFile.info.entry.getData(writer, function (blob) {
    let oFReader = new FileReader();
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
  if (zipFile.agents.entry == null) {
    readBTsTTL(zipFile, triplestore, ajax);
  } else {
    let writer = new zip.BlobWriter();
    zipFile.agents.entry.getData(writer, function (blob) {
      let oFReader = new FileReader()
      oFReader.onloadend = function (e) {
        agtActions.readTTLInput(this.result, function (importFile) {
          zipFile.agents.import = importFile;
          readBTsTTL(zipFile, triplestore, ajax);
        });
      };
      oFReader.readAsText(blob);
    }, onprogress);
  }
}

function readBTsTTL(zipFile, triplestore, ajax) {
  if (zipFile.behaviors.entry == null) {
    loadRdfGraphZipData(zipFile, triplestore, ajax);
  } else {
    let writer = new zip.BlobWriter();
    zipFile.behaviors.entry.getData(writer, function (blob) {
      let oFReader = new FileReader()
      oFReader.onloadend = function (e) {
        btActions.readTTLInput(this.result, function (importFile) {
          zipFile.behaviors.import = importFile;
          loadRdfGraphZipData(zipFile, triplestore, ajax);
        });
      };
      oFReader.readAsText(blob);
    }, onprogress);
  }
}

function getEntries(file, onend) {
  zip.createReader(new zip.BlobReader(file), function (zipReader) {
    zipReader.getEntries(onend);
  }, onerror);
}

function loadRdfGraphData(triplestore, ajax) {
  let agents = {};
  let behaviors = {};
  loadAgentRdfGraphData(ajax, triplestore, function () {
    let agentDefs = getAgentDefs();
    agents.rdf = rdfGraph.get();
    agents.defs = agentDefs;
    loadBTsRdfGraphData(ajax, triplestore, function (rdfData) {
      let btDefs = getBTDefs();
      behaviors.rdf = rdfData;
      behaviors.defs = btDefs;
      exportModal.createExportModal(agents, behaviors);
    });
  });
}

function loadRdfGraphZipData(zipFile, triplestore, ajax) {
  let matches = { agents: [], behaviors: [] };
  loadAgentRdfGraphData(ajax, triplestore, function () {
    let agentDefs = getAgentDefs();
    zipFile.agents.original.rdf = rdfGraph.get();
    zipFile.agents.original.defs = agentDefs;
    loadBTsRdfGraphData(ajax, triplestore, function (rdfData) {
      let btDefs = getBTDefs();
      zipFile.behaviors.original.rdf = rdfData;
      zipFile.behaviors.original.defs = btDefs;
      if (zipFile.agents.import)
        matches.agents = agtActions.getAgentDefsMatches(agentDefs, zipFile.agents.import);
      if (zipFile.behaviors.import)
        matches.behaviors = btActions.getTTLMatches(btDefs, zipFile.behaviors.import);
      showImportDialog(ajax, triplestore, zipFile, matches);
    });
  });
}

function loadAgentRdfGraphData(ajax, triplestore, onend) {
  let repo = (triplestore || "http://localhost:8090/rdf4j/repositories")
    + globals.agentsRepository;
  agtActions.getFromServer(ajax, repo).then(addRDFDataToGraph).then(onend);
}

function addRDFDataToGraph(rdfData) {
  rdfGraph.set(rdfData);
}

function getAgentDefs() {
  let agentDefs = {
    templates: agtActions.getAgents(),
    behaviors: agtActions.getBehaviors(),
    endpoints: agtActions.getEndpoints(),
    events: agtActions.getEvents(),
    goals: agtActions.getGoals(),
  };
  return agentDefs;
}

function loadBTsRdfGraphData(ajax, triplestore, onend) {
  let repo = (triplestore || "http://localhost:8090/rdf4j/repositories")
    + globals.behaviorsRepository;
  let cy = that.parentComponent.cytoscapeService.newCytoscapeInstance();
  nodeDefs(ajax, cy).then(function () {
    btActions.getFromServer(null, ajax, repo).then(function (rdfData) {
      onend(rdfData);
    });
  })
}

function getBTDefs() {
  return btActions.getBehaviorTrees();
}

function showImportDialog(ajax, triplestore, zipFile, matches) {
  importModal.createImportModal(matches, function () {
    if (matches.agents.length > 0) {
      rdfGraph.reset();
      rdfGraph.set(zipFile.agents.original.rdf);
      agtActions.deleteMatches(matches.agents);
      rdfGraph.addAll(zipFile.agents.import.quads);
      agtActions.saveAgentGraph(ajax, triplestore + globals.agentsRepository, null);
    } else if (zipFile.agents.import) {
      sendFile(ajax, triplestore + globals.agentsRepository, zipFile.agents.import.raw);
    }
    console.log(matches.behaviors);
    if (matches.behaviors.length > 0) {
      rdfGraph.reset();
      rdfGraph.set(zipFile.behaviors.original.rdf);
      btActions.deleteMatches(matches.behaviors, zipFile.behaviors.original.defs);
      rdfGraph.addAll(zipFile.behaviors.import.quads);
      btActions.saveGraph(ajax, triplestore + globals.behaviorsRepository, null);
    } else if (zipFile.behaviors.import) {
      sendFile(ajax, triplestore + globals.behaviorsRepository, zipFile.behaviors.import.raw);
    }
    $("#save-confirmation").trigger("showToast");
  }, zipFile.info.input);
}

export {TriplestoreListing};
