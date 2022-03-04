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
import { sendFile, deleteRepo } from "ajan-editor/helpers/RDFServices/ajax/query-rdf4j";
import queries from "ajan-editor/helpers/RDFServices/queries";
import rdfGraph from "ajan-editor/helpers/RDFServices/RDF-graph";
import modal from "ajan-editor/helpers/ui/import-modal";

let $ = Ember.$;
let repo = undefined;
let that = undefined;

export default Component.extend({
  dataBus: Ember.inject.service('data-bus'),
  repoFileName: "behaviors.ttl",
  availableBTs: undefined,
  repoContent: "",
  btFileName: "",
  btContent: "",
  init() {
    this._super(...arguments);
    that = this;
    repo =
      (localStorage.currentStore ||
        "http://localhost:8090/rdf4j/repositories") +
      globals.behaviorsRepository;

    this.get('dataBus').on('save', function (content) {
      saveGraph(content);
    });

    this.get('dataBus').on('saveExportedBT', function (bt) {
      that.set("btFileName", bt.label + "_bt.ttl");
      that.set("btContent", URL.createObjectURL(new Blob(["# Root: <" + bt.uri + "> \r\r@prefix xsd: <http://www.w3.org/2001/XMLSchema#> . " + bt.definition])));
    });

    this.get('dataBus').on('updatedBT', function () {
      $.ajax({
        url: repo,
        type: "POST",
        contentType: "application/sparql-query; charset=utf-8",
        headers: {
          Accept: "text/turtle; charset=utf-8"
        },
        data: queries.constructGraph
      }).then(function (data) {
        that.set("repoContent", URL.createObjectURL(new Blob([data])));
      });
    });
  },

  actions: {
    createBehavior() {
      this.get('dataBus').createBT();
    },

    cloneBehavior() {
      console.log("Clone!");
      this.get('dataBus').cloneBT();
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

    delete() {
      this.get('dataBus').deleteBTModal();
    },

    loadBT() {
      loadBT(event);
    },

    loadRepo() {
      loadRepo(event);
    }
  }
});

function saveGraph(content) {
  if (content != undefined && content.length > 0) {
    rdfGraph.addAll(content);
  }
  try {
    actions.saveGraph(globals.ajax, repo, globals.cy);
    $("#save-confirmation").trigger("showToast");
  } catch (e) {
    $("#error-message").trigger("showToast", [
      "Error while saving Behavior Tree"
    ]);
    throw e;
  }
  window.location.reload();
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

function loadRepo(event) {
  let file = event.target.files[0];
  console.log("File: " + file.name);
  var reader = new FileReader();
  reader.onload = function () {
    let content = reader.result;
    deleteRepo(repo, queries.deleteAll())
      .then(sendFile(repo, content))
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
  let matches = [];
  if (that.get("availableBTs"))
    matches = actions.getTTLMatches(that.get("availableBTs"), importFile);
  if (matches.length > 0) {
    modal.createImportModal(matches, function () {
      actions.deleteMatches(matches, that.get("availableBTs"));
      saveGraph(importFile.quads);
    });
  } else {
    sendFile(repo, content)
      .then(window.location.reload());
  }
}
