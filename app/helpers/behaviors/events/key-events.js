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
import detailsPane from "ajan-editor/helpers/behaviors/details-pane";
import Ember from "ember";
import freeNodes from "ajan-editor/helpers/graph/free-nodes";
import globals from "ajan-editor/helpers/global-parameters";
import rdfManager from "ajan-editor/helpers/RDFServices/RDF-manager";

let $ = Ember.$;

function keyup(cy, ur) {
	globals.ur = ur;
	document.addEventListener("keyup", keyUpHandler);
}

function keyUpHandler(event) {
	let cy = globals.cy;
	let ur = globals.ur;
	let selection = cy.$(":selected");
  if (event.ctrlKey && event.target.nodeName === "BODY") {
		switch (event.which) {
			case 67: // CTRL + C
				console.log("copy");
				copy(cy, selection);
				break;
			case 88: // CTRL + X
				cut(cy, selection);
				break;
			case 86: // CTRL + V
				console.log("paste");
				paste(ur);
				break;
			case 65: // CTRL + A
				// Select all
				cy.elements().select();
				event.preventDefault();
				break;
			case 90: // CTRL + Z
				undo(ur);
				break;
		}
	} else if (event.which == 46 || event.which == 8) {
		// Delete || Backspace
		deleteSelection(cy, ur, selection);
	}
}

function deleteSelection(cy, ur, selection) {
	// Delete only if nothing is in focus (e.g. a text input)
	if ($(":focus").length > 0) return;
	detailsPane.blur();
	// Sort so node are deleted first, to avoid errors
	selection = sortSelection(selection);
	selection.edges().forEach(edge => {
		freeNodes.push(edge.target());
	});
	// Remove one element after the other
	selection.forEach(ele => {
		console.log("deleting element ", ele);
		if (ele.hasClass("Root")) {
			console.warn("Cannot delete root of Behavior Tree");
			return;
		} else if (ele.isNode()) {
			deleteNode(ele);
		} else if (ele.isEdge()) {
			deleteEdge(ele);
		}
		if (ele) ur.do("remove", ele);
	});
	//ur.do('remove', selection);
}

function deleteNode(node) {
	// Remove all related quads from graph
	rdfManager.deleteNode(node);
	freeNodes.remove(node);
	// Add children to the free nodes
	//TODO: pushing to freeNodes here is not always correct
	freeNodes.pushArray(node.outgoers("node"));
}

function deleteEdge(edge) {
	if (!edge || !edge.source() || !edge.target()) return;
	let sourceURI = edge.source().data("uri");
	let source = edge.source();
	let target = edge.target();
	let targetURI = target.data("uri");
	let targetIndex = getEdgeIndex(edge, source);
	console.log(
		"deleting edge from",
		sourceURI,
		"to",
		targetURI,
		"at index",
		targetIndex
	);
	rdfManager.removeChildAt(sourceURI, targetIndex);
}

function getEdgeIndex(edge, parent) {
	let targetIndex = -1;
	targetIndex = parent.outgoers("edge").max((element, index) => {
		return element.same(edge) ? index : -1;
	}).value;
	return targetIndex;
}

function copy(cy, selection) {
	cy.clipboard().copy(selection);
}

function cut(cy, selection) {
	copy(cy, selection);
	selection.remove();
}

function paste(ur) {
	ur.do("paste");
}

function undo(ur) {
	ur.undo();
}

// function redo(ur) {}

function sortSelection(selection) {
	return selection.sort((a, b) => {
		if (a.isEdge() && b.isEdge()) return 0;
		if (a.isNode() && b.isNode()) return 0;
		if (a.isEdge() && b.isNode()) return 1;
		if (a.isNode() && b.isEdge()) return -1;
		return 0;
	});
}

export {keyup};
