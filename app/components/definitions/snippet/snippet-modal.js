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
import {observer} from "@ember/object";
import {Snippet} from "ajan-editor/objects/definitions/snippet";

export default Component.extend({
	snippetManager: Ember.inject.service("data-manager/snippet-manager"),
	oldUri: undefined,

	onShow: observer("show", function() {
		if (!this.show) return;

		if (!this.get("activeRow")) this.set("oldUri", undefined);
		else this.set("oldUri", this.get("snippet.storageUri"));
	}),

	actions: {
		onConfirm() {
			let snippet = this.get("snippet");
			let activeRow = this.get("activeRow");
			let table = this.get("table");

			if (!activeRow) {
				table.addRow({
					Label: snippet.label,
					Shorthand: snippet.shorthand,
					Replacement: snippet.replacement,
					Description: snippet.description
				});
				this.snippetManager.save(snippet);
			} else {
				activeRow.set("Label", snippet.label);
				activeRow.set("Shorthand", snippet.shorthand);
				activeRow.set("Replacement", snippet.replacement);
				activeRow.set("Description", snippet.description);
				this.snippetManager.replace(this.oldUri, snippet);
			}

			// TODO: Resort table?
			// let rows = table.get("rows");
			// rows = rows.filter(row => row.get("Label") !== snippet.id);
			// table.set("rows", rows);

			resetSnippet(this);
			return true;
		},

		onCancel() {
			resetSnippet(this);
		}
	}
});

function resetSnippet(that) {
	that.set("snippet", Snippet.create());
	that.get("activeRow", undefined);
}
