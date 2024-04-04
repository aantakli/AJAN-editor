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
import Ember from "ember";
import token from "ajan-editor/helpers/token";
import globals from "ajan-editor/helpers/global-parameters";

import rdf from "npm:rdf-ext";
import N3 from "npm:rdf-parser-n3";
import stringToStream from "npm:string-to-stream";

let $ = Ember.$;

let that;

export default Ember.Component.extend({
  repo: "",
  workbench: "",
  searchText: "",
  rdfEditor: undefined,
  initialContent: "",
  classNames: ["full-width full-height"],
  aceTurtle: Ember.inject.service("editor/ace-turtle"),
  dataBus: Ember.inject.service(),

  didInsertElement() {
    this._super(...arguments);
    that = this;

    setTriplestoreField();

    this.repo =
      (localStorage.currentStore ||
        "http://localhost:8090/rdf4j/repositories") +
      globals.domainRepository;

    //const clingo = require("clingo-wasm");
    //clingo.run("a. b:- a.").then(console.log);

    getDomainContent(that);
  },

  willDestroyElement() {
    this._super(...arguments);
  },

  actions: {
    search() {
      rdfSearch(this.get("searchText"));
    },

    next() {
      let editor = that.get("rdfEditor");
      editor.findNext();
    },

    previous() {
      let editor = that.get("rdfEditor");
      editor.findPrevious();
    },
  }
});

function getDomainContent(that) {
  Promise.resolve(token.resolveToken(that.ajax, localStorage.currentStore))
    .then((token) => {
      $.ajax({
        url: that.get("repo") + "/statements",
        type: "GET",
        contentType: "application/trig; charset=utf-8",
        headers: getHeaders(token)
      }).then(function (data) {
        that.set("initialContent", data);
        let editor = that.get("aceTurtle").getInstance(that);
        editor.getSession().on('change', function (data) {
          rdfUpdate(editor,data);
        });
        editor.resize();
        that.set("rdfEditor", editor);
      });
    });
}

function getHeaders(token) {
  if (token) {
    return {
      Authorization: "Bearer " + token,
      Accept: "application/trig; charset=utf-8",
    }
  } else {
    return {
      Accept: "application/trig; charset=utf-8",
    }
  }
}

function setTriplestoreField() {
  $(".store-url").text(localStorage.currentStore);
  let store = localStorage.currentStore + "domain/summary";
  store = store.replace("rdf4j", "workbench");
  that.set("workbench", store);
}

function rdfUpdate(editor) {
  let content = editor.session.getValue();
  let parser = new N3({ factory: rdf });
  let quadStream = parser.import(stringToStream(content));
  rdf.dataset().import(quadStream).then((dataset) => {
    removeAllMarkers(editor);
    $("#rdf-error").addClass('hidden');
    $("rdf-error .rdf-error-message").remove();
    that.dataBus.updateDomain(editor, that.get("repo"));
  }).catch((error) => {
    removeAllMarkers(editor);
    let message = error.message;
    let lineNumber = message.match(/on\sline\s(\d+)/)[1];
    console.log(message);
    console.log(lineNumber);
    $("#rdf-error .rdf-error-message").text(message);
    $("#rdf-error").removeClass('hidden');
    var Range = ace.require('ace/range').Range;
    editor.session.addMarker(new Range(lineNumber - 1, 0, lineNumber-1, 1), "errorMarker", "fullLine");
    that.dataBus.noUpdateDomain();
  });
}

function removeAllMarkers(editor) {
  const prevMarkers = editor.session.getMarkers();
  if (prevMarkers) {
    const prevMarkersArr = Object.keys(prevMarkers);
    for (let item of prevMarkersArr) {
      editor.session.removeMarker(prevMarkers[item].id);
    }
  }
}

function rdfSearch(search) {
  let editor = that.get("rdfEditor");
  let range = editor.find(search, {
    backwards: false,
    wrap: false,
    caseSensitive: false,
    wholeWord: false,
    regExp: false
  });
  editor.session.addMarker(range, "info", "text");
}
