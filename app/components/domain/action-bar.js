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
import queries from "ajan-editor/helpers/RDFServices/queries";
import { sendFile, deleteRepo } from "ajan-editor/helpers/RDFServices/ajax/query-rdf4j";

let $ = Ember.$;
let that = undefined;

export default Component.extend({
  unsaved: false,
  rdfContent: "",
  repo: "",
  ajax: Ember.inject.service(),
  dataBus: Ember.inject.service(),

  init() {
    this._super(...arguments);
    that = this;

    this.get('dataBus').on('updateDomain', function (editor, repo) {
      that.set("rdfContent", editor.session.getValue(), repo);
      that.set("repo", repo);
      that.set("unsaved", true);
    });
  },

  actions: {
    save() {
      let repo = that.get("repo");
      deleteRepo(that.ajax, repo, queries.deleteAll())
        .then(sendFile(that.ajax, repo, that.get("rdfContent")))
        .then(window.location.reload());
    }
  }
});
