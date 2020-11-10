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
// Ace REFERENCE: https://github.com/dfreeman/ember-ace
import {
	getCustomCompleter,
	getOptions
} from "ajan-editor/helpers/sparql-editor/ace-options";
import Service from "@ember/service";

export default Service.extend({
	vocabularyManager: Ember.inject.service("data-manager/vocabulary-manager"),
	snippetManager: Ember.inject.service("data-manager/snippet-manager"),

	init() {
		let langTools = ace.require("ace/ext/language_tools");

		let dataPromise = this.vocabularyManager.getAllDataPromise();
		dataPromise.then(data => {
			let prefixes = data.map(ele => {
				return {
					meta: "PREFIX",
					caption: ele.prefix,
					snippet: `${ele.prefix} <${ele.uri}>`,
					score: 3
				};
			});

			let snippetsPromise = this.snippetManager.getAllDataPromise();
			snippetsPromise.then(data => {
				let snippets = data.map(ele => {
					return {
						meta: ele.description,
						caption: ele.shorthand,
						snippet: ele.replacement,
						score: 2
					};
				});

				langTools.addCompleter(getCustomCompleter(prefixes, snippets));
				ace.config.set("basePath", "../assets/vendor/ace/");
			});
		});
	},

	getInstance(that) {
		let editor = ace.edit("ace-editor");
		editor.setOptions(getOptions(that));
		return editor;
	}
});
