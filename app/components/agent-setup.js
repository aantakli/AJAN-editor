/*
 * Created on Tue Nov 10 2020
 *
 * The MIT License (MIT)
 * Copyright (c) 2020 André Antakli (German Research Center for Artificial Intelligence, DFKI).
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
import /*edgehandles from */ "npm:cytoscape-edgehandles";
import {cleanDOM} from "ajan-editor/helpers/graph/cy-cleanup";
import Component from "@ember/component";
import cyEdgehandles from "ajan-editor/helpers/agents/cytoscape/edgehandles";
import cyOptions from "ajan-editor/helpers/agents/cytoscape/cytoscape";
import globals from "ajan-editor/helpers/global-parameters";
import manipulationPane from "ajan-editor/helpers/agents/manipulation-pane/common";
import nodeController from "ajan-editor/helpers/agents/cytoscape/node-controller";
import Split from "npm:split.js";

/* global cytoscape */

// References
let cy = undefined; // cytoscape

export default Component.extend({
	didInsertElement() {
		this._super(...arguments);

		// ...
		// ******************** Initialize  ********************
		// Cytoscape
		cy = cytoscape(cyOptions(document.getElementById("cy")));
		globals.cy = cy;
		cy.edgehandles(cyEdgehandles(cy));

		// Split
		initiateSplit();

		// Layout
		nodeController.init(cy);
		cy.resize();

		nodeController.updateAxes();
		nodeController.attachHandles();

		manipulationPane.initiate();
	},

	actions: {
		sort: function() {
			nodeController.newLayout();
		},
		save: function() {
			console.warn("Not yet implemented");
		}
	},

	willDestroyElement() {
		this._super(...arguments);
		cleanDOM();
	}
});

function initiateSplit() {
	Split(["#split-left", "#split-middle", "#split-right"], {
		sizes: [10, 80, 10],
		minSize: [0, 300, 0],
		direction: "horizontal",
		cursor: "col-resize",
		gutterSize: 10,
		onDragEnd: () => {
			//resize stuff in the middle
			cy.resize();
		}
	});
}
