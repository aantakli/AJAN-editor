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
import freeNodes from "ajan-editor/helpers/graph/free-nodes";
import graphOperations from "ajan-editor/helpers/graph/graph-operations";
import rdfManager from "ajan-editor/helpers/RDFServices/RDF-manager";

export default function(cy) {
	return {
		preview: true, // whether to show added edges preview before releasing selection
		hoverDelay: 50, // time spent hovering over a target node before it is considered selected
		handleNodes: "node.Composite, node.Decorator, node.Root", // selector/filter function for whether edges can be made from a given node
		handlePosition: function handlePosition(/*node*/) {
			return "right middle"; // sets the position of the handle in the format of "X-AXIS Y-AXIS" such as "left top", "middle top"
		},
		handleInDrawMode: false, // whether to show the handle in draw mode
		edgeType: function(sourceNode, targetNode) {
			// can return 'flat' for flat edges between nodes or 'node' for intermediate node between them
			// returning null/undefined means an edge can't be added between the two nodes

			// Case where no edges should be creatable
			// If target is the root
			if (targetNode.data("class") === "Root") return null;
			// If source is a leaf
			if (sourceNode.data("class") === "Leaf") return null;
			// If source is the root and target is a leaf
			if (
				sourceNode.data("class") === "Root" &&
				targetNode.data("class") === "Leaf"
			)
				return null;

			// Default
			return "flat";
		},
		loopAllowed: function(/*node*/) {
			// for the specified node, return whether edges from itself to itself are allowed
			return false;
		},
		nodeLoopOffset: -50, // offset for edgeType: 'node' loops
		nodeParams: function(/*sourceNode, targetNode*/) {
			// for edges between the specified source and target
			// return element object to be passed to cy.add() for intermediary node
			return {};
		},
		edgeParams: function(/*sourceNode, targetNode, i*/) {
			// for edges between the specified source and target
			// return element object to be passed to cy.add() for edge
			// NB: i indicates edge index in case of edgeType: 'node'
			return {};
		},
		start: function(/*sourceNode*/) {
			// fired when edgehandles interaction starts (drag on handle)
			//TODO: select source node?
			//$(':selected').removeAttr('selected');
			//sourceNode.select();
		},
		complete: function(sourceNode, targetNodes, addedEntities) {
			// fired when edgehandles is done and entities are added

			//TODO: Adjust for multiple targetNodes?
			// Special cases, preventing the deletion of edges when none can be created anyhow
			// If target is the root
			if (targetNodes[0].data("class") === "Root") return;
			// If source is a leaf
			if (sourceNode.data("class") === "Leaf") return;
			// If source is the root and target is a leaf
			if (
				sourceNode.data("class") === "Root" &&
				targetNodes[0].data("class") === "Leaf"
			)
				return;

			//TODO: also update edge id? else we might risk overlaps

			// Remove other incoming edges of the target node
			trimIncoming(sourceNode, targetNodes);
			// Root and Decorators have only one outgoing edge
			trimChildren(sourceNode, targetNodes);

			//TODO: CHECK: In case new edges were created (not a duplicate), also add them to RDF
			// Source node is the parent
			let sourceURI = sourceNode.data("uri");
			let targetURI = targetNodes.data("uri");

			rdfManager.insertChild(sourceURI, targetURI);
			// Sort list of children
			cy.emit("free", targetNodes[0]);
			// Update the edge style
			addedEntities.forEach(function(edge) {
				graphOperations.updateEdge(edge);
			});
		},
		stop: function(/*sourceNode*/) {
			// fired when edgehandles interaction is stopped (either complete with added edges or incomplete)
		},
		cancel: function(/*sourceNode, renderedPosition, invalidTarget*/) {
			// fired when edgehandles are cancelled ( incomplete - nothing has been added ) - renderedPosition is where the edgehandle was released, invalidTarget is
			// a collection on which the handle was released, but which for other reasons (loopAllowed | edgeType) is an invalid target
		},
		hoverover: function(/*targetNode*/) {
			// fired when a target is hovered
			//targetNode.addClass('active');
		},
		hoverout: function(/*targetNode*/) {
			// fired when a target isn't hovered anymore
		},
		previewon: function(/*sourceNode, targetNode, previewEles*/) {
			// fired when preview is shown
		},
		previewoff: function(/*sourceNode, targetNode, previewEles*/) {
			// fired when preview is hidden
		},
		drawon: function() {
			// fired when draw mode enabled
		},
		drawoff: function() {
			// fired when draw mode disabled
		}
	};
}

function removeDuplicateEdges(edges) {
	edges.forEach(edge => removeDuplicateEdge(edges, edge));
}

function removeDuplicateEdge(edges, edge) {
	let duplicates = edges.filter((edgeDup/*, i/*, eles*/) => {
		return (
			edgeDup.source().same(edge.source()) &&
			edgeDup.target().same(edge.target())
		);
	});
	// Do not remove oneself
	duplicates.slice(1).remove();
}

function removePriorEdges(priorEdges) {
	// Remove prior egdes
	// * From RDF
	priorEdges.forEach(priorEdge => {
		// Find prior edge source and index, then remove it
		let source = priorEdge.source();
		let sourceURI = source.data("uri");
		let sourceEdges = source.outgoers().edges();
		let at = -1;
		sourceEdges.forEach((sourceEdge, index) => {
			if (sourceEdge.same(priorEdge)) at = index;
		});
		rdfManager.removeChildAt(sourceURI, at);
	});
	// * From graph
	priorEdges.remove();
}

function trimChildren(sourceNode, targetNodes) {
	if (
		sourceNode.data("class") === "Root" ||
		sourceNode.data("class") === "Decorator"
	) {
		let edges = sourceNode.outgoers().edges();
		edges
			.filter(edge => {
				//TODO: Adjust for multiple targetNodes
				if (edge.data("target") !== targetNodes[0].id()) {
					let sourceURI = edge.source().data("uri");
					let targetURI = edge.target().data("uri");
					rdfManager.removeChild(sourceURI, targetURI);
					return true;
				}
			})
			.remove();
	}
}

function trimIncoming(sourceNode, targetNodes) {
	targetNodes.forEach(targetNode => {
		// Only consider incoming edges
		let edges = targetNode.incomers().edges();
		// Remove duplicate edges
		removeDuplicateEdges(edges);
		edges = targetNode.incomers().edges();

		// Only delete edges when necessary
		// i.e. more than one incoming edge for a node
		if (targetNode.indegree() > 1) {
			// Filter for prior edges
			let priorEdges = edges.filter(edge => !sourceNode.same(edge.source()));
			removePriorEdges(priorEdges);
		}
		// Remove targetNodes from the free nodes
		freeNodes.remove(targetNode);
	});
}
