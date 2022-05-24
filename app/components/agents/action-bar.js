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

import Component from "@ember/component";
import globals from "ajan-editor/helpers/global-parameters";
import { sendFile, deleteRepo } from "ajan-editor/helpers/RDFServices/ajax/query-rdf4j";
import rdfGraph from "ajan-editor/helpers/RDFServices/RDF-graph";
import queries from "ajan-editor/helpers/RDFServices/queries";
import modal from "ajan-editor/helpers/ui/import-modal";
import actions from "ajan-editor/helpers/agents/actions";
import token from "ajan-editor/helpers/token";

let $ = Ember.$;
let repo = undefined;
let that = undefined;

export default Component.extend({
  dataBus: Ember.inject.service('data-bus'),
  ajax: Ember.inject.service(),
  fileName: "agents.ttl",
  fileContent: "",
  agentDefs: [],

  init() {
    this._super(...arguments);
    that = this;
    repo =
      (localStorage.currentStore ||
        "http://localhost:8090/rdf4j/repositories") +
      globals.agentsRepository;

    this.get('dataBus').on('updatedAG', function () {
      Promise.resolve(token.resolveToken(that.ajax, localStorage.currentStore))
        .then((token) => {
          $.ajax({
            url: repo,
            type: "POST",
            contentType: "application/sparql-query; charset=utf-8",
            headers: getHeaders(token),
            data: queries.constructGraph
          }).then(function (data) {
            that.set("fileContent", URL.createObjectURL(new Blob([data])));
          });
        });
    });

    this.get('dataBus').on('updateAgentDefs', function (defs) {
      that.set("agentDefs", defs);
    });
  },

  actions: {
    loadRepo() {
      console.log(event.target.files);
      loadRepo(event);
    },

    loadFile() {
      loadFile(event)
    }
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

function loadRepo(event) {
  let file = event.target.files[0];
  console.log("File: " + file.name);
  var reader = new FileReader();
  reader.onload = function () {
    let content = reader.result;
    console.log(content);
    deleteRepo(that.ajax, repo, queries.deleteAll())
      .then(sendFile(that.ajax, repo, content))
      .then(window.location.reload());
  };
  reader.readAsText(file);
}

function loadFile(event) {
  let file = event.target.files[0];
  console.log("File: " + file.name);
  var reader = new FileReader();
  reader.onload = function () {
    let content = reader.result;
    readInput(content);
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
  let matches = actions.getAgentDefsMatches(that.get("agentDefs"), importFile);
  if (matches.length > 0) {
    modal.createImportModal(matches, function () {
      actions.deleteMatches(matches);
      rdfGraph.addAll(importFile.quads);
      actions.saveAgentGraph(globals.ajax, repo, that.dataBus);
      window.location.reload();
    });
  } else {
    sendFile(repo, content)
      .then(window.location.reload());
  }
}
