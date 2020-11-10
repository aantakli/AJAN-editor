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
import layout from "ajan-editor/helpers/graph/options/layout";

export default function(container_) {
	return {
		container: container_,
		//boxSelectionEnabled: true,
		//autolock: true,

		style: [
			{
				// Default node style
				selector: "node",
				style: {
					shape: "hexagon",
					label: "data(label)",
					"text-valign": "center",
					"text-halign": "center",
					"font-family": "sans-serif",
					"font-size": 20,
					"border-width": 4,
					"border-opacity": 0.7,
					"background-color": "#FFE1DB",
					"border-color": "#000"
					//label: 'data(label)',
				}
			},
			{
				selector: "edge",
				style: {
					// Some properties need updating, check updateEdge() in graph-operations.js
					"curve-style": "unbundled-bezier",
					"control-point-distances": [0, -0],
					"control-point-weights": [0.25, 0.8],
					"target-endpoint": ["-0%", "0%"],
					"source-endpoint": ["0%", "0%"],
					opacity: 0.7,
					width: 4,
					"target-arrow-shape": "triangle",
					"line-color": "#9398a0",
					"line-style": "solid",
					"target-arrow-color": "#9398a0"
				}
			},
			{
				selector: "node:selected",
				style: {
					"background-blacken": "-0.2",
					"border-color": "#ff3300",
					"border-width": 5
					//'overlay-color': '#ff3300',
					//'overlay-opacity': 0.3,
					//'overlay-padding': 6,
				}
			},
			{
				selector: "edge:selected",
				style: {
					opacity: 1,
					"line-color": "#ff3300",
					"target-arrow-color": "#ff3300"
				}
			},
			{
				selector: ".eh-handle",
				style: {
					"background-color": "#9000ff",
					opacity: 0.8,
					width: 18,
					height: 18,
					shape: "ellipse",
					"overlay-opacity": 0,
					"border-width": 5, // makes the handle easier to hit
					"border-opacity": 0
				}
			},
			{
				selector: ".eh-hover",
				style: {
					"background-color": "#9000ff"
				}
			},
			{
				selector: ".eh-source",
				style: {
					"border-color": "#9000ff"
				}
			},
			{
				selector: ".eh-target",
				style: {
					"border-color": "#9000ff"
				}
			},
			{
				selector: ".eh-preview, .eh-ghost-edge",
				style: {
					"line-color": "#9000ff",
					"target-arrow-color": "#9000ff"
				}
			}
		],
		layout: layout,

		// interaction options:
		minZoom: 1e-50,
		maxZoom: 1e50,
		zoomingEnabled: true,
		userZoomingEnabled: true,
		panningEnabled: true,
		userPanningEnabled: true,
		boxSelectionEnabled: true,
		selectionType: "single",
		touchTapThreshold: 8,
		desktopTapThreshold: 4,
		autolock: false,
		autoungrabify: false,
		autounselectify: false,

		// rendering options:
		headless: false,
		styleEnabled: true,
		hideEdgesOnViewport: false,
		hideLabelsOnViewport: false,
		textureOnViewport: false,
		motionBlur: false,
		motionBlurOpacity: 0.2,
		wheelSensitivity: 0.3,
		pixelRatio: "auto"
	};
}
