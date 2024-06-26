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
import actions from "ajan-editor/helpers/behaviors/actions";
import Component from "@ember/component";
import globals from "ajan-editor/helpers/global-parameters";
import graphOperations from "ajan-editor/helpers/graph/graph-operations";
import {deleteSelection} from "ajan-editor/helpers/behaviors/events/key-events";
import { sendFile, deleteRepo } from "ajan-editor/helpers/RDFServices/ajax/query-rdf4j";
import queries from "ajan-editor/helpers/RDFServices/queries";
import rdfGraph from "ajan-editor/helpers/RDFServices/RDF-graph";
import modal from "ajan-editor/helpers/ui/import-modal";
import token from "ajan-editor/helpers/token";
import rdf from "npm:rdf-ext";

let $ = Ember.$;
let repo = undefined;
let that = undefined;

export default Component.extend({
  dataBus: Ember.inject.service('data-bus'),
  ajax: Ember.inject.service(),
  repoFileName: "behaviors.ttl",
  availableBTs: undefined,
  unsaved: false,
  repoContent: "",
  btFileName: "",
  btContent: "",
  noSave: false,

  init() {
    this._super(...arguments);
    that = this;
    repo =
      (localStorage.currentStore ||
        "http://localhost:8090/rdf4j/repositories") +
      globals.behaviorsRepository;

    readURLParameters();

    this.get('dataBus').on('save', saveGraph);
    this.get('dataBus').on('unsavedChanges', unsavedChanges);
    this.get('dataBus').on('saveExportedBT', saveExportedBT);
    this.get('dataBus').on('updatedBT', updatedBT);
  },

  actions: {
    createBehavior() {
      this.get('dataBus').createBT();
    },

    cloneBehavior() {
      console.log("Clone!");
      this.get('dataBus').cloneBT();
    },

    generateAgent() {
      console.log("Generate Agent!");
      this.get('dataBus').generateAgent();
    },

    sort() {
      graphOperations.updateGraph(globals.cy);
    },

    save(content) {
      saveGraph(content);
      this.set("repoContent", rdfGraph.get());
    },

    restoreSave() {
      let repo =
        (localStorage.currentStore ||
          "http://localhost:8090/rdf4j/repositories") +
        globals.behaviorsRepository;
      actions.restoreSaved(globals.ajax, repo, 2);
    },

    removeSelection() {
      deleteSelection(false);
    },


    delete() {
      this.get('dataBus').deleteBTModal();
    },

    loadBT() {
      loadBT(event);
    },

    loadRepo() {
      loadRepo(event);
    }
  },

  willDestroyElement() {
    this.get('dataBus').off('save', saveGraph);
    this.get('dataBus').off('unsavedChanges', unsavedChanges);
    this.get('dataBus').off('saveExportedBT', saveExportedBT);
    this.get('dataBus').off('updatedBT', updatedBT);
  }
});

function getHeaders(token) {
  if (token) {
    return {
      Authorization: "Bearer " + token,
      Accept: "text/turtle; charset=utf-8",
    }
  } else {
    return {
      Accept: "text/turtle; charset=utf-8",
    }
  }
}

function saveGraph(content) {
  if (content != undefined && content.length > 0) {
    rdfGraph.addAll(content);
  }
  try {
    actions.saveGraph(globals.ajax, repo, globals.cy);
  } catch (e) {
    $("#error-message").trigger("showToast", [
      "Error while saving Behavior Tree"
    ]);
    throw e;
  }
}

function loadBT(event) {
  let file = event.target.files[0];
  console.log("File: " + file.name);
  var reader = new FileReader();
  reader.onload = function () {
    let content = reader.result;
    readInput(content);
  };
  reader.readAsText(file);
}

function updatedBT() {
  Promise.resolve(token.resolveToken(that.ajax, localStorage.currentStore))
    .then((token) => {
      $.ajax({
        url: repo,
        type: "POST",
        contentType: "application/sparql-query; charset=utf-8",
        headers: getHeaders(token),
        data: queries.constructGraph
      }).then(function (data) {
        that.set("repoContent", URL.createObjectURL(new Blob([data])));
      });
    });
}

function loadRepo(event) {
  let file = event.target.files[0];
  console.log("File: " + file.name);
  var reader = new FileReader();
  reader.onload = function () {
    let content = reader.result;
    deleteRepo(that.ajax, repo, queries.deleteAll())
      .then(sendFile(that.ajax, repo, content))
      .then(window.location.reload());
  };
  reader.readAsText(file);
}

function readInput(content) {
  actions.readTTLInput(content, function (importFile) {
    console.log(importFile);
    updateType(content, importFile);
  });
}

function updateType(content, importFile) {
  let matches = { behaviors: [] };
  if (that.get("availableBTs"))
    matches.behaviors = actions.getTTLMatches(that.get("availableBTs"), importFile);
  console.log(matches);
  if (matches.behaviors.length > 0) {
    modal.createImportModal(matches, function () {
      let originGraph = [...rdfGraph.data._quads];
      rdfGraph.reset();
      rdfGraph.set(rdf.dataset(importFile.quads));
      actions.deleteInverseMatches(matches.behaviors, that.get("availableBTs"));
      let matchesGraph = [...rdfGraph.data._quads];
      rdfGraph.set(rdf.dataset(originGraph));
      actions.deleteMatches(matches.behaviors, that.get("availableBTs"));
      rdfGraph.addAll(matchesGraph);
      saveGraph();
    }, actions.setImportContains(importFile));
  } else {
    sendFile(that.ajax, repo, content)
      .then(window.location.reload());
  }
}

function readURLParameters() {
  const urlParams = new URLSearchParams(window.location.search);
  let bt = urlParams.get('bt');
  if (bt) {
    that.set("noSave", true);
  }
  let agent = urlParams.get('agent');
  if (agent) {
    that.set("agent", agent);
  }
  let connect = urlParams.get('wssConnection');
  if (connect && connect == "true") {
    that.set("connect", connect);
  }
  let repo = urlParams.get('repo');
  if (repo && repo != "") {
    that.set("agentRepo", repo);
  }
}

function unsavedChanges() {
  if (!that.get("unsaved")) that.set("unsaved", true);
}

function saveExportedBT(bt) {
  that.set("btFileName", bt.label + "_bt.ttl");
  that.set("btContent", URL.createObjectURL(new Blob(["# Root: <" + bt.uri + "> \r# Label: '" + bt.label + "' \r \r@prefix xsd: <http://www.w3.org/2001/XMLSchema#> . " + bt.definition])));
}
