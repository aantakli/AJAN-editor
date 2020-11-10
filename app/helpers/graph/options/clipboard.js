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
import graphOperations from "ajan-editor/helpers/graph/graph-operations";
import rdfManager from "ajan-editor/helpers/RDFServices/RDF-manager";
import utility from "ajan-editor/helpers/RDFServices/utility";

export default {
	clipboardSize: 0,

	// The following 4 options allow the user to provide custom behavior to
	// the extension. They can be used to maintain consistency of some data
	// when elements are duplicated.
	// These 4 options are set to null by default. The function prototypes
	// are provided below for explanation purpose only.

	// Function executed on the collection of elements being copied, before
	// they are serialized in the clipboard
	beforeCopy: function(/*eles*/) {},
	// Function executed on the clipboard just after the elements are copied.
	// clipboard is of the form: {nodes: json, edges: json}
	afterCopy: function(/*clipboard*/) {},
	// Function executed on the clipboard right before elements are pasted,
	// when they are still in the clipboard.
	beforePaste: function(clipboard) {
		// If node is a root, remove it from clipboard!
		// Get IDs of root nodes
		let rootNodes = clipboard.nodes
			.filter(node => node.data.class === "Root")
			.map(n => n.data.id);
		// Remove root nodes from clipboard
		clipboard.nodes = clipboard.nodes.filter(
			node => node.data.class !== "Root"
		);
		// Remove edges related to root nodes from clipboard
		clipboard.edges = clipboard.edges.filter(edge => {
			return !(
				rootNodes.includes(edge.data.source) ||
				rootNodes.includes(edge.data.target)
			);
		});
	},
	// Function executed on the collection of pasted elements, after they
	// are pasted.
	afterPaste: function(eles) {
		// Blur details of previous selection
		detailsPane.blur();
		//Add nodes to RDF-Graph if necessary
		eles.nodes().forEach(node => {
			// If node is a decorator/composite, create new corresponding RDF resource
			let nodeClass = node.data("class");
			if (nodeClass === "Composite" || nodeClass === "Decorator") {
				console.log("Crete new blank");
				let newNodeURI = utility.generateBlankID();
				rdfManager.generateNode(
					node.data("type"),
					newNodeURI,
					node.data("label")
				);
				node.data("uri", newNodeURI);
			}

			//TODO: Add new node to free nodes list
			//freeNodes.push(cy.getElementById(newNode.data.id));
		});
		// Add edges to RDF-Graph
		eles.edges().forEach(edge => {
			// Just like adding a new edge
			// Generate new edge
			console.log(edge.source(), edge.target());
			let source = edge.source();
			let target = edge.target();
			rdfManager.insertChild(source.data("uri"), target.data("uri"));
			//TODO: Remove target from free nodes list

			//TODO: Update the edge style
			graphOperations.updateEdge(edge);
		});
	}
};
