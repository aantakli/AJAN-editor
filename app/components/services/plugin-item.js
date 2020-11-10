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
import Component from '@ember/component';
import { ACTN, HTTP } from "ajan-editor/helpers/RDFServices/vocabulary";

let self;

export default Component.extend({
	overview: null,
	activeService: null,
	activeValue: null,
	newVariable: "?",
	edit: "",
	communication: [{uri: ACTN.Synchronous, label: "Synchronous"}, {uri: ACTN.Asynchronous, label: "Asynchronous"}],
	methods: [{uri: HTTP.Get, label: "GET"}, {uri: HTTP.Post, label: "POST"}, {uri: HTTP.Put, label: "PUT"},{uri: HTTP.Patch, label: "PATCH"},
    				{uri: HTTP.Delete, label: "DELETE"},{uri: HTTP.Copy, label: "COPY"},{uri: HTTP.Head, label: "HEAD"},{uri: HTTP.Options, label: "OPTIONS"},
    				{uri: HTTP.Link, label: "LINK"},{uri: HTTP.Unlink, label: "UNLINK"},{uri: HTTP.Purge, label: "PURGE"},{uri: HTTP.Lock, label: "LOCK"},
    				{uri: HTTP.Unlock, label: "UNLOCK"},{uri: HTTP.Propfind, label: "PROPFIND"},{uri: HTTP.View, label: "VIEW"}],
	versions: [{ver: "1.0"}, {ver: "1.1"}],
	init() {
	    this._super(...arguments);
	    self = this;
			reset();
	},
	didReceiveAttrs() {
		this._super(...arguments);
	},
  actions: {}
	}
);

function reset() {
	self.activeValue = null;
	self.edit = "";
}
