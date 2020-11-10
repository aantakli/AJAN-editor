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
import Component from "@ember/component";
import {defaultQueries} from "ajan-editor/objects/default-queries";
import EditorManager from "ajan-editor/helpers/sparql-editor/instance-manager";

let editor;
let $ = Ember.$;
let TokenIterator = ace.require("ace/token_iterator").TokenIterator;

export default Component.extend({
	vocabularyManager: Ember.inject.service("data-manager/vocabulary-manager"),
	prefixes: [],

	queryManager: Ember.inject.service("data-manager/query-manager"),
	downloader: Ember.inject.service("utility/downloader"),

	classNames: ["component-mini", "menu", "background"],
	didInsertElement() {
		editor = ace.edit("ace-editor");
		let dataPromise = this.vocabularyManager.getAllDataPromise();
		let that = this;
		dataPromise.then(data => {
			data = data.map(ele => {
				return {
					label: ele.prefix,
					iri: ele.uri
				};
			});
			that.set("prefixes", data);
		});
	},

	showLoadModal: false,
	actions: {
		new() {
			ace.edit("ace-editor").setValue("", -1);
			this.set("labelValue", "");
			EditorManager.reset();
		},
		load() {
			this.set("showLoadModal", true);
		},
		save() {
			let savedQuery = EditorManager.getSave();
			if (savedQuery) {
				try {
					savedQuery.set("content", ace.edit("ace-editor").getValue());
					this.queryManager.replace(savedQuery.get("storageUri"), savedQuery);
					$("#save-confirmation").trigger("showToast");
				} catch (e) {
					$("#error-message").trigger("showToast", [
						"Error while saving query"
					]);
					throw e;
				}
			} else {
				this.set("showSaveAsModal", true);
			}
		},
		saveAs() {
			this.set("showSaveAsModal", true);
		},
		import() {
			console.warn("Clicked 'Import', missing implementation");
		},
		export() {
			let save = EditorManager.getSave();
			let saveName = save ? save.id : undefined;
			this.get("downloader").download(editor.getValue(), saveName, "rq");
		},

		ask() {
			insertTextInEditor(defaultQueries.ask);
		},
		construct() {
			insertTextInEditor(defaultQueries.construct);
		},
		describe() {
			insertTextInEditor(defaultQueries.describe);
		},
		select() {
			insertTextInEditor(defaultQueries.select);
		},
		selectDistinct() {
			insertTextInEditor(defaultQueries.selectDistinct);
		},
		update() {
			insertTextInEditor(defaultQueries.update);
		},
		prefixes() {
			insertMissingPrefixes(this);
		},

		toggleResults() {
			let event = new Event("split:toggleResults");
			let elem = document.getElementById("full-editor");
			elem.dispatchEvent(event);
		},
		toggleReferences() {
			let event = new Event("split:toggleReferences");
			let elem = document.getElementById("full-editor");
			elem.dispatchEvent(event);
		}
	}
});

function insertTextInEditor(text) {
	editor.session.insert(editor.getCursorPosition(), indentText(text));
	editor.focus();
}

function indentText(text) {
	let cursorPos = editor.getCursorPosition();
	let range = new ace.Range(cursorPos.row, 0, cursorPos.row, cursorPos.column);
	let line = editor.session.getTextRange(range);

	let regex = /^[ \t]*/; // space or tab at beginning of the line
	let match = line.match(regex)[0];

	let indentedText = text.replace(/^/gm, match); // indent every line
	indentedText = indentedText.replace(new RegExp(match), ""); // remove indent for first line (which already exists)

	return indentedText;
}

function insertMissingPrefixes(that) {
	let definedPrefixes = getDefinedPrefixes();
	let usedPrefixes = getUsedDefinedPrefixes(that);
	let difference = leftDifference(usedPrefixes, definedPrefixes);
	addMissingPrefixes(difference, that);
}

function getUsedDefinedPrefixes(that) {
	let prefixValues = that.get("prefixes").map(prefix => prefix.label);
	let matchedPrefixes = [];
	let iterator = new TokenIterator(editor.session, 0, 0);

	do {
		let token = iterator.getCurrentToken();
		if (!token || token.type == "text") continue;

		for (let i in prefixValues) {
			if (token.value.startsWith(prefixValues[i])) {
				matchedPrefixes.push(prefixValues[i]);
				prefixValues.splice(i, 1);
				break;
			}
		}
	} while (iterator.stepForward());
	return matchedPrefixes;
}

function getDefinedPrefixes() {
	let definedPrefixes = [];
	let iterator = new TokenIterator(editor.session, 0, 0);

	do {
		let token = iterator.getCurrentToken();
		if (
			!token ||
			token.type != "keyword.other.sparql" ||
			token.value.toUpperCase() !== "PREFIX"
		)
			continue;

		do {
			iterator.stepForward();
		} while (iterator.getCurrentToken().type == "text");

		definedPrefixes.push(iterator.getCurrentToken().value);
	} while (iterator.stepForward());

	return definedPrefixes;
}

function leftDifference(left, right) {
	let result = [];
	for (let i = 0; i < left.length; i++) {
		if (right.indexOf(left[i]) === -1) {
			result.push(left[i]);
		}
	}
	return result;
}

function addMissingPrefixes(missingPrefixes, that) {
	let elementsToAdd = that.get("prefixes").filter(prefix =>
		missingPrefixes.includes(prefix.label)
	);
	elementsToAdd.forEach(ele => {
		let line = `PREFIX ${ele.label} <${ele.iri}>\n`;
		editor.session.insert({row: 0, column: 0}, line);
	});
}
