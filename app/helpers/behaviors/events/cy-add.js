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
import globals from "ajan-editor/helpers/global-parameters";
import graphUtil from "ajan-editor/helpers/graph/utility";

export default cyAddEvent;

function cyAddEvent() {
	globals.cy.on("add", e => {
		let target = e.target;
		let icon = target.data("icon");
		if (!icon) return; // No icon data, so no need to manipulate

		setIcon(icon, target);
	});
}

function setIcon(icon, node) {
	node.style("background-image", icon);
	let dimensions = globals.imgDimensionsCache[icon];
	if (!dimensions) insertNewIcon(icon, node);
	else setNodeBackgroundDimensions(node, dimensions);
}

function insertNewIcon(icon, node) {
	let img = new Image();
	img.onload = function() {
		setNodeBackgroundDimensions(node, getNewImageDimensions(img, icon));
	};
	img.src = icon;
}

function setNodeBackgroundDimensions(node, dimensions) {
	node.style("background-height", dimensions.height);
	node.style("background-width", dimensions.width);
}

function getNewImageDimensions(img, icon) {
	let dimensions = computeImgDimensions(img, icon);
	globals.imgDimensionsCache[icon] = dimensions;
	return dimensions;
}

function computeImgDimensions(img) {
	let dimensions = {};
	let aspectRatio = img.width / img.height;
	let heightVal = 0.8 * graphUtil.getNodeHeight();
	dimensions.height = heightVal + "px";
	dimensions.width = aspectRatio * heightVal + "px";
	return dimensions;
}
