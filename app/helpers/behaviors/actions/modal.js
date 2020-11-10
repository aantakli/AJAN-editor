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
import generateBT from "ajan-editor/helpers/behaviors/actions/modal/generate-bt";

let $ = Ember.$;

export default {
	addBT: generateBT,

	//TODO: old methods
	// Open and initiate the modal
	openModal: function(cy, name) {
		let modal = $(".ui." + name + ".modal");
		modal.modal({observeChanges: true});
		modal.modal("show");
		modal.css("top", "5vh");

		let elements = cy.json().elements;
		console.log(elements);
		$("#textJSON").val(JSON.stringify(elements));
	},

	// Close the JSON modal
	closeJSON: function() {
		$(".ui.editorJSON.modal").modal("hide");
		// TODO: Check for changes, make sure the user wants to close it (discard changes or not)
	},

	// Close the Help modal
	closeHelp: function() {
		$(".ui.editorHelp.modal").modal("hide");
	},

	// Discards changes to the JSON
	cancelJson: function(cy) {
		console.log("cancel editing JSON");
		$("#textJSON").val(JSON.stringify(cy.json().elements));
		//return false;
	},

	// Saves changes to the JSON and apllies them to the graph
	saveJson: function(cy) {
		console.log("saving JSON");
		// TODO: Hide the modal on 'save'?
		//$('.ui.editorJSON.modal').modal('hide')

		// Apparently edges will not be displayed for changed nodes when both are updated in the same batch
		// Thus we first update the nodes, then the edges
		let nodes = JSON.parse($("#textJSON").val()).nodes;
		let elementsNodes = {
			elements: {
				nodes: nodes
			}
		};
		cy.json(elementsNodes);

		let edges = JSON.parse($("#textJSON").val()).edges;
		let elementsEdges = {
			elements: {
				nodes: nodes,
				edges: edges
			}
		};
		cy.json(elementsEdges);

		// TODO: Show JSON parsing errors to user
	}
};
