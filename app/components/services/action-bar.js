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
import Component from "@ember/component";
import globals from "ajan-editor/helpers/global-parameters";
import { sendFile } from "ajan-editor/helpers/RDFServices/ajax/query-rdf4j";
import { RDF, ACTN } from "ajan-editor/helpers/RDFServices/vocabulary";
import actions from "ajan-editor/helpers/services/actions";
import queries from "ajan-editor/helpers/RDFServices/queries";
import consumer from "ajan-editor/helpers/RDFServices/servicesRDFConsumer";
import token from "ajan-editor/helpers/token";
import modal from "ajan-editor/helpers/ui/import-modal";
import rdf from "npm:rdf-ext";
import N3 from "npm:rdf-parser-n3";
import stringToStream from "npm:string-to-stream";

let $ = Ember.$;
let repo = undefined;
let that = undefined;

export default Component.extend({
  dataBus: Ember.inject.service('data-bus'),
  fileName: "actions.ttl",
  fileContent: "",
  importContent: "",
  overview: null,

  init() {
    this._super(...arguments);
    that = this;
    repo =
      (localStorage.currentStore ||
        "http://localhost:8090/rdf4j/repositories") +
      globals.servicesRepository;

    this.get('dataBus').on('updatedSG', function () {
      Promise.resolve(token.resolveToken(that.ajax, localStorage.currentStore))
        .then((token) => {
          $.ajax({
            url: repo,
            type: "POST",
            contentType: "application/sparql-query; charset=utf-8",
            headers: getHeaders(token),
            data: queries.getAllServiceActions
          }).then(function (data) {
            that.set("fileContent", URL.createObjectURL(new Blob([data])));
          });
        });
    });

    this.get('dataBus').on('deletedSG', function () {
      sendFile(that.ajax, repo, that.get("importContent"))
        .then(window.location.reload());
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

function loadFile(event) {
  let file = event.target.files[0];
  console.log("File: " + file.name);
  var reader = new FileReader();
  reader.onload = function () {
    let content = reader.result;
    readTTLInput(content, function (importFile) {
      let matches = { actions: getMatches(importFile) };
      modal.createImportModal(matches, function () {
        console.log(matches);
        matches.actions.forEach(match => {
          if (match.import && match.match) {
            let defs = that.overview.availableServices;
            let old = defs.find((item) => item.uri == match.uri);
            actions.deleteService(old);
          }
          if (match.import) {
            actions.createService(match);
          }
        });
        actions.saveGraph(globals.ajax, repo, that.dataBus, "updated");
        window.location.reload();
      }, importFile.info);
    });
  }
  reader.readAsText(file);
}

function readTTLInput(content, onend) {
  console.log("readTTLInput");
  let parser = new N3({ factory: rdf });
  let quadStream = parser.import(stringToStream(content));
  let importFile = {
    info: { contains: [] },
    raw: content,
    quads: [],
    objects: [],
    resources: []
  };
  let result = consumer.getActionsGraph(quadStream, true);
  result.then(function (result) {
    importFile.objects = result[0].services;
    importFile.resources = result[0].services.map(obj => { return obj.uri });
    console.log(importFile.objects);
    importFile.objects.forEach(obj => {
      importFile.info.contains.push({
        type: ACTN.ServiceAction,
        uri: obj.uri,
        name: obj.label
      });
    });
    onend(importFile);
  });
}

function getMatches(importFile) {
  let matches = [];
  let defs = that.overview.availableServices;
  importFile.objects.forEach(obj => {
    let match = defs.find((item) => item.uri == obj.uri);
    if (match != undefined) {
      obj.import = true;
      obj.match = true;
      matches.push(obj);
    } else {
      obj.import = true;
      obj.match = false;
      matches.push(obj);
    }
  });
  return matches;
}

function loadRepo(event) {
  let file = event.target.files[0];
  console.log("File: " + file.name);
  var reader = new FileReader();
  reader.onload = function () {
    let content = reader.result;
    console.log(content);
    that.set("importContent", content);
    deleteAllServiceActions();
  };
  reader.readAsText(file);
}

function deleteAllServiceActions() {
  console.log(that.overview.availableServices);
  let services = that.overview.availableServices;
  services.forEach(x => {
    actions.deleteService(x);
  });
  actions.saveGraph(globals.ajax, repo, that.dataBus, "deleted");
}
