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
import Component from "@ember/component";
import {filterRows} from "ajan-editor/helpers/tables/utility";
import {onColumnClick} from "ajan-editor/helpers/definitions/tables/table-helper";
import Table from "ember-light-table";
import {task/*, timeout*/} from "ember-concurrency";

let triples = [
	{
		label: "Subject",
		valuePath: "subject",
		resizable: true,
		minResizeWidth: 100,
		width: "33%"
	},
	{
		label: "Predicate",
		valuePath: "predicate",
		resizable: true,
		minResizeWidth: 100,
		width: "34%"
	},
	{
		label: "Object",
		valuePath: "object",
		resizable: true,
		minResizeWidth: 100,
		width: "33%"
	}
];

let none = [
	{
		label: "No results to show",
		valuePath: "xxx",
		resizable: false,
		minResizeWidth: 100
	}
];

let queryDependant = [
	{
		label: "Not yet implemented",
		valuePath: "1",
		resizable: false,
		minResizeWidth: 100
	}
];

export default Component.extend({
	classNames: ["auto-size full-width"],
	didInsertElement() {},
	isLoading: computed
		.or("filterAndSortModel.isRunning", "setRows.isRunning")
		.readOnly(),
  showTable: true,

  modeChanged: observer("mode", "dataFormat", "data", function () {
		switch (this.get("mode")) {
			case "all":
				this.set("columns", triples);
				break;
			case "where":
				this.set("columns", triples);
				break;
			case "query":
        this.set("columns", queryDependant);
        if (this.get("dataFormat") === "RDF") this.set("columns", triples);
        else if (this.get("dataFormat") === "TABLE") {
          if (this.get("tableData")) {
            this.set("columns", calculateColumns(this.get("tableData")));
          }
        }
				else if (this.get("dataFormat") === "BOOL") {
					this.set("showTable", false);
					return;
				}
				break;
			case "none":
			default:
				this.set("columns", none);
		}
		this.set("showTable", true);
	}),

	filterChange: observer("filter.column", "filter.value", function() {
		this.get("filterAndSortModel").perform();
	}),

  columns: computed(function () {
    if (this.get("dataFormat") === "RDF") {
      return [
        {
          label: "Subject",
          valuePath: "subject",
          resizable: true,
          minResizeWidth: 100,
          width: "33%"
        },
        {
          label: "Predicate",
          valuePath: "predicate",
          resizable: true,
          minResizeWidth: 100,
          width: "34%"
        },
        {
          label: "Object",
          valuePath: "object",
          resizable: true,
          minResizeWidth: 100,
          width: "33%"
        }
      ];
    } else if (this.get("dataFormat") === "TABLE") {
      return calculateColumns(this.get("tableData"));
    }
  }),

  defaultRows: undefined,

  rows: computed("tableData", function () {
    let tableData = this.get("tableData");
    if(this.get("tableData")) {
      this.set("columns", calculateColumns(this.get("tableData")));
    }
		this.set("defaultRows", tableData ? tableData.slice() : undefined);
		return filterRows(tableData, this.get("filter"));
	}),

  table: computed("model", "rows", "columns", function () {
    if (this.get("tableData")) {
      this.set("columns", calculateColumns(this.get("tableData")));
    }
		return new Table(this.get("columns"), this.get("rows"), {enableSync: true});
	}),

	// Sort Logic
	sortedRows: computed.sort("defaultRows", "sortBy").readOnly(),
	sortBy: computed("dir", "sort", function() {
		return [`${this.get("sort")}:${this.get("dir")}`];
	}).readOnly(),

	filterAndSortModel: task(function*(/*debounceMs = 200*/) {
		// yield timeout(debounceMs); // debounce
		let result = this.get("sortedRows");
		let filter = this.get("filter");
		result = filterRows(result, filter);
		yield this.get("setRows").perform(result);
	}).restartable(),

	setRows: task(function*(rows) {
		// this.get("table").setRows([]);
		// yield timeout(100); // Allows isLoading state to be shown
		yield this.get("table").setRows(rows);
	}).restartable(),

	actions: {
		onColumnClick(column) {
			onColumnClick(column, this);
		}
	}
});

function calculateColumns(data) {
  let array = [];
  let object = data[0];
  let size = Object.keys(object).length;

  for (const [key, value] of Object.entries(object)) {
    array.push({
      label: key,
      valuePath: key,
      resizable: true,
      minResizeWidth: 10,
      width: (100/size)+"%"
      }
    );
  }
  return array;
}
