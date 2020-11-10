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
let tableActionColumn = {
	label: "",
	valuePath: "tableActions",
	width: "75pt",
	sortable: false,
	cellClassNames: "cell-actions",
	cellComponent: "definitions/table-actions"
};

let tableDeleteColumn = {
	label: "",
	valuePath: "tableActions",
	width: "37pt",
	sortable: false,
	cellClassNames: "cell-actions",
	cellComponent: "tables/delete-row"
};

let tableQueryColumn = {
	label: "",
	valuePath: "tableActions",
	width: "75pt",
	sortable: false,
	cellClassNames: "cell-actions",
	cellComponent: "tables/query-definition-actions"
};

function onColumnClick(column, that) {
	if (column.sorted) {
		that.setProperties({
			dir: column.ascending ? "asc" : "desc",
			sort: column.get("valuePath")
		});
		that.get("filterAndSortModel").perform(0);
	}
}

function deleteEntry(row, rowID, that, onConfirm) {
	let id = row.get(rowID);
	let confirmed = window.confirm(`Are you sure you want to delete "${id}"?`);

	if (confirmed) {
		if (onConfirm) onConfirm(id);

		that.get("table").removeRow(row);
		// row.get("content").deleteRecord();
	}
}

export {
	tableActionColumn,
	tableDeleteColumn,
	tableQueryColumn,
	onColumnClick,
	deleteEntry
};
