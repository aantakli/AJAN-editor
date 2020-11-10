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
import {computed} from "@ember/object";
import {A as emberA} from "@ember/array";
import {onColumnClick} from "ajan-editor/helpers/definitions/tables/table-helper";
import SortableMixin from "ajan-editor/mixins/table/sortable";
import Table from "ember-light-table";

let editor;

export default Component.extend(SortableMixin, {
	snippetManager: Ember.inject.service("data-manager/snippet-manager"),
	classNames: ["full-width"],
	didInsertElement() {
		editor = ace.edit("ace-editor");
	},

	model: null,

	columns: computed(function() {
		return [
			{
				label: "Label",
				valuePath: "label",
				resizable: true,
				minResizeWidth: 100,
				width: "100%"
			},
			// {
			// 	label: "Shorthand",
			// 	valuePath: "shorthand",
			// 	resizable: true,
			// 	minResizeWidth: 100,
			// 	width: "50%"
			// },
			// {
			// 	label: "Description",
			// 	valuePath: "description",
			// 	resizable: true,
			// 	minResizeWidth: 100,
			// 	width: "50%"
			// }
		];
	}),

	rows: computed(function() {
		this.set("isLoading", true);
		const rows = emberA();

		let dataPromise = this.snippetManager.getAllDataPromise();

		dataPromise.then(data => {
			data.forEach(ele => {
				rows.pushObject({
					label: ele.label,
					shorthand: ele.shorthand,
					replacement: ele.replacement,
					description: ele.description
				});
			});

			let newTable = new Table(this.get("columns"), rows);
			this.set("table", newTable);
			this.set("isLoading", false);
		});

		return;
	}),

	table: computed("model", function() {
		return new Table(this.get("columns"), this.get("rows"));
	}),

	actions: {
		onColumnClick(column) {
			onColumnClick(column, this);
		},

		onRowClick(row) {
			insertTextInEditor(row.content.replacement);
		}
	}
});

function insertTextInEditor(text) {
	editor.session.insert(editor.getCursorPosition(), text);
	editor.focus();
}
