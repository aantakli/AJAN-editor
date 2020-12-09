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
import Ember from "ember";
import nodeDefs from "ajan-editor/helpers/RDFServices/node-definitions/node-defs";

let $ = Ember.$;

export default {
	set,
	blur
};

class NodeData {
	constructor(node) {
		this.node = node;
		this.label = node.data("label") || "";
		this.uri = node.data("uri") || "";
		this.nodeClass = node.data("class") || "";
		this.nodeType = node.data("type") || "";
		this.structure = this.getNodeStructure();
	}

	getNodeStructure() {
		let type = this.node.data("type");
		let typeDef = nodeDefs.getTypeDef(type);
		return typeDef ? typeDef.structure : undefined;
	}
}

function set(evt) {
	let target = evt.target;
  let nodeData = new NodeData(target);
	$("#node-properties").trigger("sendNodeData", nodeData);
}

function getContainer(nodeData) {
	let $container = $("#info-container");
	if (nodeData) $container.uri = nodeData.uri;
	return $container;
}

function blur() {
	$(":focus").blur();
	getContainer().empty();
}
