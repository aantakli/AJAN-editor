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
import actions from "ajan-editor/helpers/behaviors/actions";
import btNodes from "ajan-editor/helpers/graph/bt-nodes";
import Ember from "ember";
import globals from "ajan-editor/helpers/global-parameters";
import rdfManager from "ajan-editor/helpers/RDFServices/RDF-manager";

let $ = Ember.$;

export default function() {
	console.log("Adding a Behavior Tree");
	$("#modal-header-title").text("New Behavior Tree");
	let $body = $("#modal-body"),
		$modal = $("#universal-modal");
	$body.empty();
	$modal.show();

	// Label
	let $labelTitle = $("<p>", {
		class: "modal-p"
	}).text("Label: ");
	let $labelInput = $("<input>", {
		class: "modal-input",
		id: "label-input",
		placeholder: "Label"
	});
	let $labelDiv = $("<div>", {
		class: "modal-body-div"
	}).append($labelTitle, $labelInput);

	// URI
	let $uriTitle = $("<p>", {
		class: "modal-p"
	}).text("URI: ");
	let $uriInput = $("<input>", {
		class: "modal-input",
		id: "uri-input",
		placeholder: "URI",
		value: globals.baseURI
	});
	let $uriDiv = $("<div>", {
		class: "modal-body-div"
	}).append($uriTitle, $uriInput);

	// Append to modal body
	$body.append($labelDiv, $uriDiv);

	// Listen for the confirm event
	let elem = document.getElementById("universal-modal");
	elem.addEventListener("modal:confirm", () => {
		let label = $labelInput.val();
		let uri = $uriInput.val();
		rdfManager.generateBT(uri, label);
		btNodes.addNewBT(uri, label);
    actions.addNewBT($("#bt-select"), uri, label);
    let dataBus = Ember.inject.service('data-bus');
    dataBus.greet();
	});
}
