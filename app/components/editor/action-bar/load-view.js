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
	tableDeleteColumn,
	tableQueryColumn
} from "ajan-editor/helpers/definitions/tables/table-helper";
import Component from "@ember/component";
import EditorManager from "ajan-editor/helpers/sparql-editor/instance-manager";
import {A as emberA} from "@ember/array";
import SortableMixin from "ajan-editor/mixins/table/sortable";
import Table from "ember-light-table";

export default Component.extend(SortableMixin, {
	queryManager: Ember.inject.service("data-manager/query-manager"),
	router: Ember.inject.service(),

	model: null,
	isLoading: false,

	rowClassNames: computed(function() {
		if (this.get("short")) return "default-cursor";
		else return "";
	}),

	columns: computed(function() {
		let columns = [
			{
				label: "Label",
				valuePath: "id",
				resizable: true,
				minResizeWidth: 100,
				width: "20%"
			},
			{
				label: "Description",
				valuePath: "description",
				resizable: true,
				minResizeWidth: 100,
				width: "30%"
			},
			{
				label: "Tags",
				valuePath: "tags",
				resizable: true,
				minResizeWidth: 100
			},
			{
				label: "Date modified",
				valuePath: "dateModified",
				resizable: true,
				minResizeWidth: 100,
				width: "20%"
			}
		];

		if (!this.get("short")) {
			if (this.get("isDefinition")) {
				columns.push(tableQueryColumn);
			} else {
				columns.push(tableDeleteColumn);
			}
		}

		return columns;
	}),

	rows: computed(function() {
		return getRows(this);
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

	// Update when display state changed
	displayChanged: observer("show", function() {
		if (this.get("show")) {
			let rows = getRows(this);
			this.set("rows", rows);
			this.get("table").setRows(rows);
		}
	}),


	actions: {
		onColumnClick(column) {
			if (column.sorted) {
				this.setProperties({
					dir: column.ascending ? "asc" : "desc",
					sort: column.get("valuePath")
				});
				this.get("filterAndSortModel").perform(0);
			}
		},

		onRowDoubleClick(row) {
			openRowInQueryEditor(this, row);
		},

		onRowClick(row) {
			if (this.get("isDefinition")) return;
			console.log("clicked row: ", row.get("id"), this.get("isDefinition"));
			let id = row.get("id");

			if (this.overrideRowClick) this.overrideRowClick(this, id, row);
			else loadToEditor(this, row);
		},

		editEntry(row) {
			openRowInQueryEditor(this, row);
		},

		deleteEntry(row) {
			let that = this;
			deleteEntry(row, "id", this, function() {
				that.queryManager.remove(row.get("data"));
			});
		}
	}
});

function openRowInQueryEditor(that, row) {
	if (!that.get("isDefinition")) return;
	console.log("clicked row: ", row.get("id"), that.get("isDefinition"));
	that.get("router").transitionTo("editor.queries");
	setTimeout(function() {
		loadToEditor(that, row);
	}, 1000);
}

function getRows(that) {
	that.set("isLoading", true);
	const rows = emberA();

	let dataPromise = that.queryManager.getAllDataPromise();

	dataPromise.then(data => {
		data.forEach(ele => {
			rows.pushObject({
				id: ele.id,
				description: ele.description,
				tags: ele.tags,
				dateModified: new Date(ele.modified).toLocaleString("en-GB"),
				data: ele
			});
		});

		let newTable = new Table(that.get("columns"), rows);
		that.set("table", newTable);
		that.set("isLoading", false);
	});

	return;
}

function loadToEditor(that, row) {
	try {
		let data = row.get("data");
		ace.edit("ace-editor").setValue(data.content, -1);
		that.set("show", false);
		that.set("labelValue", data.id);
		EditorManager.setSave(data);
	} catch (e) {
		console.warn("ACE editor instance error:", e);
	}
}
