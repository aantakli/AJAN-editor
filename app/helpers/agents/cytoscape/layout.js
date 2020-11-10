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
let topPadding = 12; // in percent

export default function(cy) {
	return {
		name: "grid",

		fit: true, // whether to fit the viewport to the graph
		padding: 30, // padding used on fit
		boundingBox: undefined, // constrain layout bounds; { x1, y1, x2, y2 } or { x1, y1, w, h }
		avoidOverlap: true, // prevents node overlap, may overflow boundingBox if not enough space
		avoidOverlapPadding: 30, // extra spacing around nodes when avoidOverlap: true
		nodeDimensionsIncludeLabels: false, // Excludes the label when calculating node bounding boxes for the layout algorithm
		spacingFactor: undefined, // Applies a multiplicative factor (>0) to expand or compress the overall area that the nodes take up
		condense: true, // uses all available space on false, uses minimal space on true
		rows: undefined, // force num of rows in the grid
		cols: 3, // force num of columns in the grid
		position: function(node) {
			if (node.hasClass("endpoint"))
				return {
					col: 0
				};
			if (node.hasClass("event"))
				return {
					col: 1
				};
			if (node.hasClass("behavior"))
				return {
					col: 2
				};
		}, // returns { row, col } for element
		sort: function(a, b) {
			return a.position("y") - b.position("y");
		}, // a sorting function to order the nodes; e.g. function(a, b){ return a.data('weight') - b.data('weight') }
		animate: false, // whether to transition the node positions
		animationDuration: 300, // duration of animation in ms if enabled
		animationEasing: undefined, // easing of animation if enabled
		animateFilter: function(/*node/*, i*/) {
			return true;
		}, // a function that determines whether the node should be animated.  All nodes animated by default on animate enabled.  Non-animated nodes are positioned immediately when the layout starts
		ready: undefined, // callback on layoutready
		stop: undefined, // callback on layoutstop
		transform: function(node, position) {
			// Top offset
			position.y = position.y + (cy.height() * topPadding) / 100;

			// Constrain nodes to rows
			let segment = cy.width() / 6;
			let endpointX = segment;
			let eventX = segment * 3;
			let behaviorX = segment * 5;
			if (node.hasClass("endpoint")) position.x = endpointX;
			if (node.hasClass("event")) position.x = eventX;
			if (node.hasClass("behavior")) position.x = behaviorX;

			return position;
		} // transform a given node position. Useful for changing flow direction in discrete layouts
	};
}
