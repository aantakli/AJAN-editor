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
import Split from "npm:split.js";

let referenceIndex = 2;
let resultIndex = 1;

export default Component.extend({
	elementId: "full-editor",
	classNames: ["full-height"],

	// After the element has been inserted into the DOM
	didInsertElement() {
		let split = initializeSplitPanes();
		// Also resize the ace editor after initialising Split
		ace.edit("ace-editor").resize();

		let elem = document.getElementById("full-editor");

		bindToggleResultsEvent(split, elem);
		bindToggleReferencesEvent(split, elem);
	} // end didInsertElement
});

function initializeSplitPanes() {
	return Split(
		["#split-editor-left", "#split-editor-middle", "#split-editor-right"],
		{
			sizes: [35, 50, 15],
			minSize: [0, 0, 0],
			direction: "horizontal",
			cursor: "col-resize",
			gutterSize: 10,
			onDragEnd: () => {
				//
				ace.edit("ace-editor").resize();
			}
		}
	);
}

function bindToggleResultsEvent(split, elem) {
	let lastReferenceSize = 0;
	elem.addEventListener("split:toggleReferences", () => {
		let sizes = split.getSizes();
		if (sizes[referenceIndex] > 1) {
			lastReferenceSize = sizes[referenceIndex];
			split.collapse(referenceIndex);
		} else {
			if (sizes[resultIndex] > lastReferenceSize) {
				sizes[resultIndex] =
					sizes[resultIndex] - lastReferenceSize + sizes[referenceIndex];
			} else {
				sizes[0] = sizes[0] - lastReferenceSize + sizes[referenceIndex];
			}
			sizes[referenceIndex] = lastReferenceSize;
			split.setSizes(sizes);
		}
	});
}

function bindToggleReferencesEvent(split, elem) {
	let lastResultSize = 0;
	elem.addEventListener("split:toggleResults", () => {
		let sizes = split.getSizes();
		if (sizes[resultIndex] > 1) {
			lastResultSize = sizes[resultIndex];
			split.collapse(resultIndex);
		} else {
			if (sizes[referenceIndex] > lastResultSize) {
				sizes[referenceIndex] =
					sizes[referenceIndex] - lastResultSize + sizes[resultIndex];
			} else {
				sizes[0] = sizes[0] - lastResultSize + sizes[resultIndex];
			}
			sizes[resultIndex] = lastResultSize;
			split.setSizes(sizes);
		}
	});
}
