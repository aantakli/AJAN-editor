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
import graphOperations from "ajan-editor/helpers/graph/graph-operations";
import {initiateSelect} from "ajan-editor/helpers/ui/select";
import parser from "ajan-editor/helpers/behaviors/parser";
import rdfGraph from "ajan-editor/helpers/RDFServices/RDF-graph";

let $ = Ember.$;

export default {
 	// setDefaultBT,
 	addNewBT
};

// function setDefaultBT(cy, behaviorGraphs) {
// 	selectBT(cy, behaviorGraphs, localStorage.getItem("bt-selected"));

// 	// Add BT options to the select elements
// 	let $select = $("#bt-select");
// 	$select.empty();

// 	behaviorGraphs.forEach(graph => {
// 		addNewBT($select, graph.uri, graph.name);
// 	});

// 	// Bind change event
// 	$select.off("change").on("change", () => {
// 		if (rdfGraph.unsavedChanges) {
// 			window.alert(
// 				"There are unsaved changes, please save or discard before changing the selected Behavior Tree"
// 			);
// 			$select.val(localStorage.getItem("bt-selected"));
// 			return;
// 		}
// 		localStorage.setItem("bt-selected", $select.val());
// 		$("#behavior-tree").trigger("refresh");
// 		// globals.currentComponent.rerender();
// 	});

// 	//TODO: Save selected option in browser storage
// 	$select.val(localStorage.getItem("bt-selected"));
// 	initiateSelect();
// }

// function selectBT(cy, behaviorGraphs, selectedURI) {
// 	// Find matching graph
// 	let graphUnparsed =
// 		behaviorGraphs.findBy("uri", selectedURI) || behaviorGraphs[0];
// 	// Set selection
// 	$("#bt-select").val(graphUnparsed.uri);
// 	// Store index for next session
// 	localStorage.setItem("bt-selected", graphUnparsed.uri);
// 	// Parse correct graph
// 	let graph = parser.behavior2cy(graphUnparsed);
// 	try {
// 		cy.$().remove();
// 		cy.add(graph.nodes);
// 		cy.add(graph.edges);
// 	} catch (e) {
// 		console.warn("Errors while creating graph:", e);
// 	}

// 	// update the graph
// 	graphOperations.updateGraphInit(cy);
// }

function addNewBT($select, uri, label) {
  $select.append(
    $("<div></div>")
      .attr("data-value", uri)
      .addClass("item")
 			.text(label)
  );
 	initiateSelect();
}
