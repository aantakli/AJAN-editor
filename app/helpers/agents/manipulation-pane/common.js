/*
 * Created on Tue Nov 10 2020
 *
 * The MIT License (MIT)
 * Copyright (c) 2020 André Antakli, Xueting Li (German Research Center for Artificial Intelligence, DFKI).
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
import Ember from "ember";

import globals from "ajan-editor/helpers/global-parameters";
import nodeContoller from "ajan-editor/helpers/agents/cytoscape/node-controller";
import util from "ajan-editor/helpers/RDFServices/utility";

let $ = Ember.$;
let cy;

export default {
	initiate
};

function initiate() {
	cy = globals.cy;
	populateWithDummy();
	bindDropEvent();
}

function populateWithDummy() {
	console.log("dummy");
	let item = {};
	item.id = "endpoint1";
	item.class = "endpoint";
	item.title = "Predefined Endpoint";
	let item2 = {};
	item2.id = "event1";
	item2.class = "event";
	item2.title = "Predefined Event";
	let item3 = {};
	item3.id = "behavior1";
	item3.class = "behavior";
	item3.title = "Predefined Behavior";

	createEntry(item);
	createEntry(item2);
	createEntry(item3);
}

function createEntry(item) {
	let $div = $("<div>", {
		id: item.id,
		class: "node-draggable"
	}).append($("<p></p>").text(item.title));
	$("#" + item.class).append($div);

	bindDragEvent(item, $div);
}

function bindDragEvent(item, $div) {
	$div.attr("draggable", "true");
	$div.bind("dragstart", e => {
		e.originalEvent.dataTransfer.effectAllowed = "move";
		e.originalEvent.dataTransfer.setData("class", item.class);
		e.originalEvent.dataTransfer.setData("id", item.id);
		e.originalEvent.dataTransfer.setData("label", item.title);
		// console.log("dragstart:", e.originalEvent.dataTransfer.getData("type"));
	});
}

function bindDropEvent() {
	let $cy = $("#cy");
	$cy.on("dragover", e => {
		e.preventDefault();
	});
	$cy.on("drop", e => {
		//e.preventDefault();
		let dropClass = e.originalEvent.dataTransfer.getData("class");
		//let id = e.originalEvent.dataTransfer.getData('id');
		let id = util.generateUUID();
		let label = e.originalEvent.dataTransfer.getData("label");
		let uri;
		// console.log("dropping:", dropClass);

		/*
		let label, uri;
		// Special case for Behavior Tree node
		if (dropClass === 'BehaviorTree') {
			label = dropType;
			uri = e.originalEvent.dataTransfer.getData('uri');
			rdfManager.generateNode(dropClass, uri, label);
			dropType = dropClass;
			dropClass = 'Leaf';
		} else {
			let nodeData = rdfManager.generateNodeData(dropType);
			label = nodeData.label;
			uri = nodeData.uri;
		}

    let id = util.generateUUID();
    */

		//TODO: Drop in right column
		let pos = {
			x: event.offsetX,
			y: event.offsetY
		};

		let newNode = generateNode(id, label, uri, dropClass, pos);
		console.log(newNode, ">with position " + pos.x + ", " + pos.y);
		let nodeRef = cy.add(newNode);
		//freeNodes.push(cy.getElementById(newNode.data.id));

		//TODO: add edgehandle
		nodeContoller.newNode(nodeRef);
	});
}

function generateNode(id, label, uri, nodeClass, pos) {
	return {
		group: "nodes",
		data: {
			id,
			label
		},
		/*scratch: {
			// Additional data can be stored inside the node by adding it here
			uri,
			class: dropClass
		},*/
		// cytoscape classes, not node class!
		classes: nodeClass,
		renderedPosition: pos
	};
}
