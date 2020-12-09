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
import {computed, observer} from "@ember/object";
import Component from "@ember/component";
import Ember from "ember";
import {Node} from "ajan-editor/objects/behaviors/node";

let $ = Ember.$;
let modeId = "behaviors_properties_advanced_mode";

export default Component.extend({
	nodeProperties: Ember.inject.service("behaviors/node-properties"),
	queryInsertion: Ember.inject.service("behaviors/query-insertion-manager"),

	elementId: "node-properties",
	localClassNames: ["side-menu", "details"],
	classNames: ["flex-container", "vertical"],
	showProperties: false,
	node: Node.create(),

	didInsertElement() {
		let that = this;

    $("#node-properties").on("sendNodeData", function (e, nodeData) {
      let node = Node.create(nodeData);
			that.set("node", node);
			that.set("showProperties", true);
			that.get("queryInsertion").set("nodeType", node.nodeType);
			that.get("queryInsertion").set("uri", node.uri);
		});

		$("#node-properties").on("blurProperties", function() {
			that.set("showProperties", false);
		});
	},

	advancedMode: computed(function() {
		let mode = localStorage.getItem(modeId);
		if (!mode) return true;
		return mode == "true";
	}),

	advancedModeChange: observer("advancedMode", function() {
		localStorage.setItem(modeId, this.advancedMode);
	}),

	labelChange: observer("node.label", function() {
		this.get("nodeProperties").updateLabel(this.get("node"));
	}),

	descriptionChange: observer("node.description", function() {
		this.get("nodeProperties").updateDescription(this.get("node"));
	})
});
