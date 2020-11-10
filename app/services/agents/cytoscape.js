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
import clipboard from "npm:cytoscape-clipboard";
import {computed} from "@ember/object";
import cytoscape from "npm:cytoscape";
import dagre from "npm:cytoscape-dagre";
import edgehandles from "npm:cytoscape-edgehandles";
import options from "ajan-editor/helpers/graph/graph-options";
import Service from "@ember/service";
import undoRedo from "npm:cytoscape-undo-redo";

export default Service.extend({
	cy: computed(function() {
		return cytoscape(options.getCytoOptions(document.getElementById("cy")));
	}),
	ur: undefined,

	init() {
		registerCystoscapeExtensions();
		this.setCystoscapeExtensionsOptions();
	},

	newCytoscapeInstance() {
		let cy = cytoscape(options.getCytoOptions(document.getElementById("cy")));
		this.set("cy", cy);
		this.setCystoscapeExtensionsOptions();
		return cy;
	},

	setCystoscapeExtensionsOptions() {
		/*eh = */ this.cy.edgehandles(options.edgehandles(this.cy));
		this.set("ur", this.cy.undoRedo(options.undoRedo));
		// cb = cy.clipboard(options.clipboard);
	}
});

function registerCystoscapeExtensions() {
	cytoscape.use(dagre);
	cytoscape.use(edgehandles);
	cytoscape.use(undoRedo);
	cytoscape.use(clipboard);
}
