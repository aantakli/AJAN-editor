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
import {ND, RDFS} from "ajan-editor/helpers/RDFServices/vocabulary";
import util from "./util";

let quads;
let iconPrefix = "data:image/png;base64,";

export default function(quads_, nodeURI) {
	quads = quads_;
	let styleURI = util.findQuad(quads, nodeURI, ND.style).object.value;
	let selector = util.findQuad(quads, nodeURI, ND.name).object.value;
	let fixedLabel =
		util.findQuad(quads, nodeURI, ND.labelType).object.value === ND.Fixed;
	let defaultLabel = util.getObjectValue(quads, nodeURI, RDFS.label);
	return generateStyle(styleURI, defaultLabel, selector, fixedLabel);
}

function generateStyle(styleURI, defaultLabel, selector, fixedLabel = false) {
	let style = {};

	let icon = util.getObjectValue(quads, styleURI, ND.icon);
  /*if (icon) {
    console.log("icon", icon);
    let iconDataQuad = util.findQuad(quads, icon, ND.data);
    console.log("iconDataQuad", iconDataQuad);
    iconDataQuad = util.findQuad(quads, icon, 'http://www.ajan.de/behavior/nd-ns#data');
    console.log("iconDataQuad", iconDataQuad);
    if (iconDataQuad) {
      icon = "data:image/png;base64," + iconDataQuad.object.value;
      console.log("icon", icon);
    }
  }*/


	if (icon) icon = iconPrefix + icon;
  let node_icon = util.getObjectValue(quads, styleURI, ND.node_icon);
	if (node_icon) node_icon = iconPrefix + node_icon;
	//TODO: Check whether label will be properly overwritten for dynamic labels later on
	if (defaultLabel && fixedLabel) style["label"] = defaultLabel;
	let bgColor = util.getObjectValue(quads, styleURI, ND.color);
	if (bgColor) style["background-color"] = bgColor;
	let lbColor = util.getObjectValue(quads, styleURI, ND.labelColor);
	if (lbColor) style["color"] = lbColor;
	let padding = util.getObjectValue(quads, styleURI, ND.padding);
	if (padding) style["padding"] = padding;
	let relativePadding = util.getObjectValue(quads, styleURI, ND.paddingTo);
	if (relativePadding) style["padding-relative-to"] = relativePadding;
	if (!fixedLabel) {
		style["width"] = "label";
		//style['width'] = (defaultLabel.length + 3) + 'em';
		style["text-margin-x"] = icon ? "1.5em" : 0;
		style["text-halign"] = "center";

		//TODO: support custom icon (e.g. import from nodeDefs)
		//TODO: for fixedLabel, display only icon
		style["background-position-x"] = "1em";
	}
	let shape = util.findQuad(quads, styleURI, ND.shape).object.value;
	//TODO: make sure all possible style options for cytoscape are covered
	//TODO: Throw error when sth cannot be parsed
	if (shape.startsWith(ND.defaultPrefix)) {
		shape = shape.slice(ND.defaultPrefix.length).toLowerCase();
		style["shape"] = shape;
		if (shape === "polygon") {
			style["shape-polygon-points"] = JSON.parse(
				util.getObjectValue(quads, styleURI, ND.polygon)
			);
		}
	}
	return {
		selector: "node." + selector.replace(/ /g, ""),
		style,
		icon,
    node_icon
	};
}
