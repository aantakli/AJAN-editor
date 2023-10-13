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

let $ = Ember.$;

let that;

export default Ember.Component.extend({
  repo: "",
  workbench: "",
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
        console.log(editor);
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
  console.log(editor.session.getValue());
  that.dataBus.updateDomain(editor, that.get("repo"));
}
