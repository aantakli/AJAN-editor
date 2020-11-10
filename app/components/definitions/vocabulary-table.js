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
import {computed, observer} from "@ember/object";
import {
	deleteEntry,
	onColumnClick,
	tableActionColumn
} from "ajan-editor/helpers/definitions/tables/table-helper";
import Component from "@ember/component";
import {A as emberA} from "@ember/array";
import SortableMixin from "ajan-editor/mixins/table/sortable";
import Table from "ember-light-table";
import {Vocabulary} from "ajan-editor/objects/definitions/vocabulary";

let prefix = {
	label: "Prefix",
	placeholder: "Prefix"
};

let uri = {
	label: "URI",
	placeholder: "URI"
};

let description = {
	label: "Description",
	placeholder: ""
};

export default Component.extend(SortableMixin, {
	vocabularyManager: Ember.inject.service("data-manager/vocabulary-manager"),

	model: null,
	showModal: false,
	vocabulary: Vocabulary.create(),

	rowClassNames: computed(function() {
		if (this.get("short")) return "default-cursor";
		else return "";
	}),

	columns: computed(function() {
		let columns = [
			{
				label: prefix.label,
				valuePath: prefix.label,
				resizable: true,
				minResizeWidth: 100,
				width: "20%"
			},
			{
				label: description.label,
				valuePath: description.label,
				resizable: true,
				minResizeWidth: 100,
				width: "30%"
			},
			{
				label: uri.label,
				valuePath: uri.label,
				resizable: true,
				minResizeWidth: 100
			}
		];

		if (!this.get("short")) {
			columns.push(tableActionColumn);
		}

		return columns;
	}),

	rows: computed(function() {
		this.set("isLoading", true);
		const rows = emberA();

		let dataPromise = this.vocabularyManager.getAllDataPromise();

		dataPromise.then(data => {
			data.forEach(ele => {
				rows.pushObject({
					[prefix.label]: ele.id,
					[uri.label]: ele.uri,
					[description.label]: ele.description,
					data: ele
				});
			});

			let newTable = new Table(this.get("columns"), rows);
			this.set("table", newTable);
			this.set("isLoading", false);
		});

		return;
	}),

	table: computed("model", function() {
		let newTable = new Table(this.get("columns"), this.get("rows"));
		newTable
			.get("rows")
			.forEach(row => row.set("classNames", this.get("rowClassNames")));
		return newTable;
	}),

	tableChanged: observer("table", "table.rows", "table.rows.[]", function() {
		this.set("rows", this.get("table.rows"));
		this.get("table")
			.get("rows")
			.forEach(row => row.set("classNames", this.get("rowClassNames")));
	}),

	actions: {
		addEntry() {
			this.set("showModal", true);
		},

		deleteEntry(row) {
			let that = this;
			deleteEntry(row, prefix.label, this, function() {
				that.vocabularyManager.remove(row.get("data"));
			});
		},

		editEntry(row) {
			let vocabulary = row.get("data");
			this.set("vocabulary", vocabulary);
			this.set("activeRow", row);
			this.set("showModal", true);
		},

		onColumnClick(column) {
			onColumnClick(column, this);
		}
	}
});
