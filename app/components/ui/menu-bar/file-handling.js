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
import Component from '@ember/component';
import queries from "ajan-editor/helpers/RDFServices/queries";
import token from "ajan-editor/helpers/token";
import { sendFile, deleteRepo } from "ajan-editor/helpers/RDFServices/ajax/query-rdf4j";

let $ = Ember.$;
let repo = undefined;
let that = undefined;

export default Component.extend({

  ajax: Ember.inject.service(),
  fileName: "",
  fileType: ".trig",
  rdf4jRepo: "",
  accept: "application/trig; charset=utf-8",
  contentType: "application/trig; charset=utf-8",

  init() {
    this._super(...arguments);
    that = this;
    repo =
      (localStorage.currentStore ||
        "http://localhost:8090/rdf4j/repositories") +
      this.get("rdf4jRepo");
  },

  actions: {
    loadRepo() {
      loadRepo(event);
    },

    exportRepo() {
      Promise.resolve(token.resolveToken(that.ajax, localStorage.currentStore))
        .then((token) => {
          $.ajax({
            url: repo + "/statements",
            type: "GET",
            contentType: this.get("contentType"),
            headers: getHeaders(token)
          }).then(function (data) {
            console.log(data);
            downloadFile(URL.createObjectURL(new Blob([data])));
          });
        });
    }
  }
});

function loadRepo(event) {
  let file = event.target.files[0];
  var reader = new FileReader();
  reader.onload = function () {
    let content = reader.result;
    deleteRepo(that.ajax, repo, queries.deleteAll())
      .then(() => {
        sendFile(that.ajax, repo, content).then(() => {
          window.location.reload()
        });
      })
  };
  reader.readAsText(file);
}

function getHeaders(token) {
  if (token) {
    return {
      Authorization: "Bearer " + token,
      Accept: that.get("accept"),
    }
  } else {
    return {
      Accept: that.get("accept"),
    }
  }
}

function downloadFile(content) {
  const link = document.createElement("a");
  link.style.display = "none";
  link.href = content;
  link.download = that.get("fileName") + that.get("fileType");
  document.body.appendChild(link);
  link.click();

  setTimeout(() => {
    URL.revokeObjectURL(link.href);
    link.parentNode.removeChild(link);
  }, 0);
}
