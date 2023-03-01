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
import globals from "ajan-editor/helpers/global-parameters";
import graphUtil from "ajan-editor/helpers/graph/utility";
import options from "ajan-editor/helpers/graph/graph-options";

let scaleFactor = 3;

export default {
	blur,
	updateGraph: function(cy) {
		this.updateLayout(cy);
		this.updateEdges(cy);
	},

	// Initial updateGraph call, which does not sort the nodes based on their vertical position
	updateGraphInit: function(cy) {
		this.updateLayoutInit(cy);
		this.updateEdges(cy);
    graphUtil.setEachNodeParameters(cy);
	},

	updateLayoutInit: function(cy) {
		//TODO: Use existing layout (globals)
		let layout = cy.layout(options.layout);
		layout.run();
		//printNodes(cy, layout.options.eles);
	},

	updateLayout: function(cy) {
		//TODO: Define layout once, run over and over again?

		let layout = cy.layout(options.layout);
		let nodes = layout.options.eles.nodes();
		let edges = layout.options.eles.edges();

		// Sort nodes
		nodes = nodes.sort(function(a, b) {
			return a.position("y") - b.position("y");
		});

		//Sort edges
		edges = edges.sort(function(a, b) {
			let aID = a._private.data.target;
			let aPos = cy.$id(aID)._private.position.y;
			let bID = b._private.data.target;
			let bPos = cy.$id(bID)._private.position.y;
			return aPos - bPos;
		});

		layout.options.eles = nodes.union(edges);
		layout.run();
	},

	updateEdges: function(cy) {
		let edges = cy.edges();
		edges.forEach(this.updateEdge);
	},

	updateEdge: function(edge) {
		if (!edge) return;
		// Update control points
		let sourceY = edge.sourceEndpoint().y;
		let targetY = edge.targetEndpoint().y;
		let diffY = targetY - sourceY;
		let controlPoint = diffY / scaleFactor;
		controlPoint = isNaN(controlPoint) ? 0 : controlPoint;
		edge.style("control-point-distances", [-controlPoint, controlPoint]);
		// Update start- and endpoint
		edge.style("target-endpoint", ["-50%", "0%"]);
		edge.style("source-endpoint", ["50%", "0%"]);
	}
};

function blur() {
	globals.cy.$(":selected").unselect();
	details.blur();
}
