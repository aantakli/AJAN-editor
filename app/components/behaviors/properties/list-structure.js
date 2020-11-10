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
import {computed} from "@ember/object";
import {RDF} from "ajan-editor/helpers/RDFServices/vocabulary";
import rdfGraph from "ajan-editor/helpers/RDFServices/RDF-graph";
import rdfManager from "ajan-editor/helpers/RDFServices/RDF-manager";

export default Component.extend({
	classNames: ["behavior", "side-pane", "container", "list"],
	didInsertElement() {
		$("#" + this.get("elementId") + ">.ui.accordion")
			.accordion()
			.on("click", function(e) {
				e.stopPropagation();
			});
	},

	hasSetAsChild: computed("uri", "list", function() {
		let structure = this.get("list");
		return structure.parameterSets && structure.parameterSets.length > 0;
	}),

	itemStructure: computed("uri", "list", function() {
		let structure = {};
		if (this.get("hasSetAsChild")) {
			checkParameterConstraints(this);
			structure = this.get("list.parameterSets")[0];
		} else {
			checkSetConstraints(this);
			structure = this.get("list.parameters")[0];
		}
		if (!structure.mapping) structure.mapping = RDF.first;
		return structure;
	}),

	listItemChanged: undefined,
	listItems: computed("uri", "list", "listItemChanged", function() {
		let childURI = rdfGraph.getObjectValue(
			this.get("uri"),
			this.get("list").mapping
		);
		return getItemList(childURI);
	}),

	actions: {
		addItem: function() {
			insertItemInRDF(this.get("uri"), this.get("list"));
			this.notifyPropertyChange("listItemChanged");
		},
		removeItem: function(itemUri) {
			removeItemFromRDF(itemUri);
			this.notifyPropertyChange("listItemChanged");
		}
	}
});

function checkParameterConstraints(that) {
	if (that.get("list.parameterSets").length > 1)
		console.warn("Too many parameter sets inside list", that.get("list.title"));
}

function checkSetConstraints(that) {
	if (that.get("list.parameters").length > 1)
		console.warn("Too many parameters inside list", that.get("list.title"));
}

function getItemList(nextUri) {
	let items = [];
	while (nextUri && nextUri !== RDF.nil) {
		items.push(nextUri);
		nextUri = rdfGraph.getObjectValue(nextUri, RDF.rest);
	}
	return items;
}

function insertItemInRDF(uri, structure) {
	let blankNode;
	({blankNode} = rdfManager.listPushBlankNode(uri, structure.mapping));
	rdfManager.generateStructure(structure, blankNode, true);
}

function removeItemFromRDF(uri) {
	rdfManager.removeListItem(uri);
}
