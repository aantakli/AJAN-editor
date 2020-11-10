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
import Component from "@ember/component";
import Ember from "ember";
import {getVariableNamesFromQuery} from "ajan-editor/helpers/sparql-editor/utility";
import {observer} from "@ember/object";
import {SPARQLHighlightRules} from "ajan-editor/helpers/definitions/ace-editor/custom-sparql-highlighter";
import Split from "npm:split.js";
import {Template} from "ajan-editor/objects/definitions/template";

let dynamicMode;
let editor;

export default Component.extend({
	classNames: ["full-height"],

	templateManager: Ember.inject.service("data-manager/template-manager"),

	template: Template.create(),
	queryVariables: [],
	usedQueryVariables: [],
	freeQueryVariables: [],

	oldUri: undefined,

	onShow: observer("show", function() {
		if (!this.show) return;

		if (!this.get("activeRow")) this.set("oldUri", undefined);
		else this.set("oldUri", this.get("template.storageUri"));
		ace.edit("ace-editor").setValue(this.get("template.query"), -1);
	}),

	// After the element has been inserted into the DOM
	didInsertElement() {
		this._super(...arguments);
		initializeSplitPanes();

		let that = this;
		editor = ace.edit("ace-editor");

		setDynamicMode();
		setHighlightRules(this);

		editor.getSession().on("change", function() {
			that.set("queryVariables", getVariableNamesFromQuery());
		});
	}, // end didInsertElement

	variablesChanged: observer(
		"queryVariables",
		"template.parameters.@each.variable",
		function() {
			this.get("template").set("queryVariables", this.get("queryVariables"));
			setHighlightRules(this);
		}
	),

	actions: {
		onConfirm: function() {
			let template = this.get("template");
			let activeRow = this.get("activeRow");
			let table = this.get("table");

			template.set("queryVariables", getVariableNamesFromQuery());
			template.set("query", ace.edit("ace-editor").getValue());
			template.resetParameterValues();

			if (!activeRow) {
				table.addRow({
					Name: template.id,
					Target: template.nodes,
					Description: template.description,
					data: template
				});
				this.templateManager.save(template);
			} else {
				activeRow.set("Name", template.id);
				activeRow.set("Target", template.nodes);
				activeRow.set("Description", template.description);
				this.templateManager.replace(this.oldUri, template);
			}

			resetTemplate(this);
			return true;
		},

		onCancel: function() {
			resetTemplate(this);
		}
	}
});

function resetTemplate(that) {
	that.set("template", Template.create());
	that.get("activeRow", undefined);
}

function initializeSplitPanes() {
	splitHorizontal();
	splitVertical();
}

function splitHorizontal() {
	Split(["#split-left", "#split-right"], {
		sizes: [50, 50],
		minSize: [200, 200],
		direction: "horizontal",
		cursor: "col-resize",
		gutterSize: 10,
		onDragEnd: () => {
			//
		}
	});
}

function splitVertical() {
	Split(["#split-top", "#split-bot"], {
		sizes: [50, 50],
		minSize: [200, 200],
		direction: "vertical",
		cursor: "col-resize",
		gutterSize: 10,
		onDragEnd: () => {
			//
		}
	});
}

function setDynamicMode() {
	let TextMode = ace.require("ace/mode/text").Mode;
	dynamicMode = new TextMode();
	dynamicMode.HighlightRules = SPARQLHighlightRules;
	editor.session.setMode(dynamicMode);
}

function setHighlightRules(that) {
	let template = that.get("template");
	let usedVariables = template.getUsedVariables();
	let freeVariables = template.getFreeVariables(usedVariables);

	usedVariables = usedVariables.flatMap(v => ["?" + v, "$" + v]);
	freeVariables = freeVariables.flatMap(v => ["?" + v, "$" + v]);

	dynamicMode.$highlightRules.setKeywords({
		highlightedVariable: usedVariables.join("|"),
		"variable.other.sparql": freeVariables.join("|")
	});

	editor.session.bgTokenizer.start(0);
}

// function clickedOutsideModal() {
// 	// When the user clicks anywhere outside of the modal, close it
// 	$modal.off("click").click(event => {
// 		if (event.target == $modal[0]) {
// 			$modal.hide();
// 		}
// 	});
// }
