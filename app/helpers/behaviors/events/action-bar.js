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
import actions from "ajan-editor/helpers/behaviors/actions";
import Ember from "ember";
import globals from "ajan-editor/helpers/global-parameters";
import graphOperations from "ajan-editor/helpers/graph/graph-operations";

let $ = Ember.$;

export default function() {
	let cy = globals.cy;
	let ajax = globals.ajax;

	$("#actionbar-save")
		.off("click")
		.click(function() {
			let repo =
				(localStorage.currentStore ||
					"http://localhost:8090/rdf4j/repositories") +
				"/" +
				globals.behaviorsRepository;
			actions.saveGraph(ajax, repo, cy);
		});

	$("#actionbar-addBT")
		.off("click")
		.click(function() {
			actions.addBT();
		});

	$("#actionbar-sort")
		.off("click")
		.click(function() {
			graphOperations.updateGraph(cy);
		});

	$("#actionbar-restore")
		.off("click")
		.click(function() {
			let repo =
				(localStorage.currentStore ||
					"http://localhost:8090/rdf4j/repositories") +
				"/" +
				globals.behaviorsRepository;
			actions.restoreSaved(ajax, repo, 2);
		});
}
