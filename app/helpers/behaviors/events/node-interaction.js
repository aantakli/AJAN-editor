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
import details from "ajan-editor/helpers/behaviors/details-pane";
import Ember from "ember";
import graphOperations from "ajan-editor/helpers/graph/graph-operations";
import rdfManager from "ajan-editor/helpers/RDFServices/RDF-manager";

let $ = Ember.$;

export default clickNode;

function clickNode(cy) {
	cy.off("click").on("click", function(event) {
		details.blur();
		$("#node-properties").trigger("blurProperties");
		trySettingDetails(event);
	});
}

function trySettingDetails(event) {
	let isNode;
	try {
		isNode = event.target.isNode();
	} catch (e) {}
	if (isNode) details.set(event);
}

function dragNode(cy) {
	cy.off("drag").on("drag", "node", function(event) {
		// Properly update edges while draging the corresponding node
		let edges = event.target.connectedEdges();
		edges.forEach(graphOperations.updateEdge);
	});
}

function freeNode(cy) {
	cy.off("free").on("free", function(event, optionalLoad) {
		// After letting go of a node:
		// Check whether the vertical order relative to siblings has changed

		let target = setFreeNodeTarget(event, optionalLoad);
		let parent = getParent(target);
		if (parent) {
			let {sortedEdges, sortedChildNodeUris} = getSortedEdgeListForParent(
				cy,
				parent
			);
			updateParentEdgeOrder(parent, sortedEdges);
			rdfManager.reorderChildren(parent.data("uri"), sortedChildNodeUris);
		}
	});
}

function getParent(target) {
	try {
		return target.incomers().nodes()[0];
	} catch (error) {
		throw "Could not find parent node";
	}
}

function getSortedEdgeListForParent(cy, parent) {
	let sortedChildNodes = verticallySortCollection(parent.outgoers("node"));
	let sortedEdges = getVerticallySortedEdges(sortedChildNodes, parent, cy);
	return transformCollectionsToArrays(sortedChildNodes, sortedEdges);
}

function getVerticallySortedEdges(sortedChildNodes, parent, cy) {
	let sortedEdges = cy.collection();
	sortedChildNodes.forEach(childNode => {
		sortedEdges.merge(parent.edgesTo(childNode));
	});
	sortedEdges = sortedEdges.union(parent.incomers("edge"));
	return sortedEdges;
}

function verticallySortCollection(collection) {
	return collection.sort(function(firstNode, secondNode) {
		return firstNode.position("y") - secondNode.position("y");
	});
}

function transformCollectionsToArrays(sortedChildNodes, sortedEdges) {
	sortedEdges = sortedEdges.toArray();
	let sortedChildNodeUris = mapNodesToUriArray(sortedChildNodes);
	return {sortedEdges, sortedChildNodeUris};
}

function mapNodesToUriArray(nodeCollection) {
	let nodesUriArray = nodeCollection.map(node => {
		return node.data("uri");
	});
	return removeUndefinedElements(nodesUriArray);
}

function removeUndefinedElements(array) {
	return array.filter(element => element);
}

function updateParentEdgeOrder(parent, orderedEdges) {
	orderedEdges.forEach((edge, index) => {
		parent._private.edges[index] = edge;
	});
}

function setFreeNodeTarget(event, optionalLoad) {
	let target;
	if (optionalLoad) {
		try {
			if (optionalLoad.isNode()) target = optionalLoad;
		} catch (error) {}
	} else {
		try {
			if (event.target.isNode()) target = event.target;
		} catch (error) {}
	}
	if (!target) {
		console.warn("Not a node: ", target);
		throw "Freed entity is not a node";
	}
	return target;
}

export {clickNode, dragNode, freeNode};
