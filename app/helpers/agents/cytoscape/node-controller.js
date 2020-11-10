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
import cyLayout from "ajan-editor/helpers/agents/cytoscape/layout";
import globals from "ajan-editor/helpers/global-parameters";

let xAxisEndpoints, xAxisEvents, xAxisBehaviors;
let layout, cy;

export default {
	init,
	newNode,
	attachHandles,
	updateAxes,
	newLayout
};

function init(cy_) {
	cy = cy_;
	newLayout();
	bindCyEvents();
}

function newNode(node) {
	callHandle(attachHandle, node);
	callHandle(positionHandle, node);
	newLayout();
}

function newLayout() {
	layout = cy.layout(cyLayout(cy));
	layout.run();
	callHandles(positionHandle);
	return layout;
}

function updateAxes() {
	let cy = globals.cy;
	xAxisEndpoints = cy.$(".endpoint").position("x");
	xAxisEvents = cy.$(".event").position("x");
	xAxisBehaviors = cy.$(".behavior").position("x");
}

function bindCyEvents() {
	globals.cy.on("layoutstart", () => callHandles(positionHandle));
	globals.cy.on("resize", () => {
		layout.run();
		updateAxes();
		callHandles(positionHandle);
	});
}

function positionNode(node) {
	let newX = node.hasClass("endpoint")
		? xAxisEndpoints
		: node.hasClass("event")
			? xAxisEvents
			: node.hasClass("behavior")
				? xAxisBehaviors
				: 0;
	let pos = node.position();
	pos.x = newX;
}

function callHandles(callback) {
	globals.cy.nodes().forEach(node => {
		callHandle(callback, node);
	});
}
function callHandle(callback, node) {
	if (node.hasClass("endpoint"))
		callback(generateParams(node, "endpoint", "right"));
	else if (node.hasClass("behavior"))
		callback(generateParams(node, "behavior", "left"));
	else if (node.hasClass("event")) {
		callback(generateParams(node, "event", "left"));
		callback(generateParams(node, "event", "right"));
	}
}

function attachHandles() {
	callHandles(attachHandle);
}

function attachHandle(params) {
	let pos = params.node.position();

	let handle = {
		data: {
			id: params.node.id() + "-handle-" + params.relativePos
		},
		position: {
			x:
				params.relativePos === "left"
					? pos.x - params.node.outerWidth() / 2
					: pos.x + params.node.outerWidth() / 2,
			y: pos.y
		},
		classes:
			"custom-handle " + classString(params.nodeClass, params.relativePos),
		grabbable: false
	};

	params.handle = globals.cy.add(handle);
	bindNodeEvents(params);
}

function bindNodeEvents(params) {
	params.node.on("drag", () => {
		positionNode(params.node);
		positionHandle(params);
	});
	params.node.on("free", () => {
		layout.run();
		callHandles(positionHandle);
	});
}

function positionHandle(params) {
	let pos = params.node.position();
	params.handle.position({
		x:
			params.relativePos === "left"
				? pos.x - params.node.outerWidth() / 2
				: pos.x + params.node.outerWidth() / 2,
		y: pos.y
	});
}

function generateParams(node, nodeClass, relativePos) {
	let handle = globals.cy.$("#" + node.id() + "-handle-" + relativePos);
	return {
		node,
		nodeClass,
		relativePos,
		handle
	};
}

function classString(nodeClass, relativePos) {
	return "ch-" + nodeClass + "-" + relativePos;
}
