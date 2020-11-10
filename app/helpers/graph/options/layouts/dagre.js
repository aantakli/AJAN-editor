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
export default {
	name: "dagre",

	// dagre algo options, uses default value on undefined
	nodeSep: undefined, // the separation between adjacent nodes in the same rank
	edgeSep: undefined, // the separation between adjacent edges in the same rank
	rankSep: undefined, // the separation between adjacent nodes in the same rank
	rankDir: "LR", // 'TB' for top to bottom flow, 'LR' for left to right,
	ranker: "network-simplex", // Type of algorithm to assign a rank to each node in the input graph. Possible values: 'network-simplex', 'tight-tree' or 'longest-path'
	minLen: function(/*edge*/) {
		return 1;
	}, // number of ranks to keep between the source and target of the edge
	edgeWeight: function(/*edge*/) {
		return 1;
	}, // higher weight edges are generally made shorter and straighter than lower weight edges

	// general layout options
	fit: true, // whether to fit to viewport
	padding: 30, // fit padding
	spacingFactor: 0.8, // Applies a multiplicative factor (>0) to expand or compress the overall area that the nodes take up
	nodeDimensionsIncludeLabels: false, // whether labels should be included in determining the space used by a node
	animate: true, // whether to transition the node positions
	animateFilter: function(/*node, i*/) {
		return true;
	}, // whether to animate specific nodes when animation is on; non-animated nodes immediately go to their final positions
	animationDuration: 200, // duration of animation in ms if enabled
	animationEasing: undefined, // easing of animation if enabled
	boundingBox: undefined, // constrain layout bounds; { x1, y1, x2, y2 } or { x1, y1, w, h }
	transform: function(node, position) {
		// transform a given node position. Useful for changing flow direction in discrete layouts
		return {
			x: position.x * 2,
			y: position.y
		};
	},
	ready: function() {}, // on layoutready
	stop: function() {} // on layoutstop
};
