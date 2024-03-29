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
import { TriplestoreCollection } from "ajan-editor/helpers/home/triplestore-collection";
import triplestoreHelper from "ajan-editor/helpers/home/triplestore-helper";

let $ = Ember.$;
let self;
let triplestoreCollection;
let ajax = null; // ajax

export default Ember.Component.extend({
  ajax: Ember.inject.service(),
  cytoscapeService: Ember.inject.service("behaviors/cytoscape"),

  didInsertElement() {
		this._super(...arguments);
		// ...
		self = this;
		triplestoreCollection = new TriplestoreCollection(this);
    bindEnterEvent();
    addDefinedTriplestore();
	},

	actions: {
		addTriplestore
	}
});

function addDefinedTriplestore() {
  const urlParams = new URLSearchParams(window.location.search);
  let name = urlParams.get('name');
  let uri = urlParams.get('uri');
  if (name && uri) {
    triplestoreCollection.insertDefinedTriplestore(name, uri);
  }
}

function addTriplestore() {
	triplestoreCollection.insertNewTriplestore();
	triplestoreHelper.clearNewTriplestoreInput(self.ajax);
}

function bindEnterEvent() {
  triplestoreHelper.bindEnter($("#uri"), self.actions.addTriplestore);
  triplestoreHelper.bindEnter($("#secured"), self.actions.addTriplestore);
	triplestoreHelper.bindEnter($("#label"), self.actions.addTriplestore);
}
