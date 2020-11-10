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
import {task, timeout} from "ember-concurrency";
import {computed} from "@ember/object";
import Mixin from '@ember/object/mixin';

export default Mixin.create({
	// Sort Logic
	sortedRows: computed.sort("rows", "sortBy").readOnly(),
	sortBy: computed("dir", "sort", function() {
		return [`${this.get("sort")}:${this.get("dir")}`];
	}).readOnly(),

	filterAndSortModel: task(function*(debounceMs = 200) {
		yield timeout(debounceMs); // debounce
		let sortedRows = this.get("sortedRows");
		yield this.get("setRows").perform(sortedRows);
	}).restartable(),

	setRows: task(function*(rows) {
		// this.get("table").setRows([]);
		yield timeout(100); // Allows isLoading state to be shown
		this.get("table").setRows(rows);
	}).restartable(),
});
