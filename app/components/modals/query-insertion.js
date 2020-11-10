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
import {inject} from "@ember/service";
import {Template} from "ajan-editor/objects/definitions/template";

// Use Embers instance of jQuery
let $ = Ember.$;
let $modal;

export default Ember.Component.extend({
	queryInsertion: inject("behaviors/query-insertion-manager"),
	query: "",
	template: undefined,
	resetTabs: 1,
	tabs: {
		template: true,
		transformToSparql: false,
		loadQuery: false,
		newSparql: false
	},
	// After the element has been inserted into the DOM
	didInsertElement() {
		this._super(...arguments);
		let that = this;

		$modal = $("#modal-query-insertion");
		this.get("queryInsertion").on("showModal", function() {
			try {
				if (that) {
					that.set("template", that.get("queryInsertion.template"));
					that.set("query", that.get("queryInsertion.query"));
				}
			} catch (e) {
				console.warn(e)
			} finally {
				$modal.show();
			}
		});

		$modal.on("customShow", function() {
			$modal.show();
			loadTemplate(that);
		});
	}, // end didInsertElement

	// ******************** Declare actions ********************
	// actions used in the .hbs file
	actions: {
		close: function() {
			closeModal(this);
		},

		confirm: function() {
			if (this.get("tabs.template")) {
				// setStorageJSON(getNodeUri(), this.get("template").toJSON());
				this.get("queryInsertion").set(
					"targetBase",
					this.get("template.targetBase")
				);
				this.get("queryInsertion").set("template", this.get("template"));
			}

			this.get("queryInsertion").set("query", this.get("query"));
			this.get("queryInsertion").confirmModalChanges();
			closeModal(this);
		},

		cancel: function() {
			closeModal(this);
		}
	}
}); //end Ember export

function closeModal(that) {
	$modal.hide();
	resetTabs(that);
	if (that)	that.set("template", undefined);
}

function resetTabs(that) {
	that.set("tabs.template", true);
	that.set("tabs.transformToSparql", false);
	that.set("tabs.loadQuery", false);
	that.set("tabs.newSparql", false);
}

function setStorageJSON(id, object) {
	localStorage.setItem(id, JSON.stringify(object));
}

function getStorageJSON(id) {
	// let item = localStorage.getItem(id);
	// return item ? JSON.parse(item) : undefined;
}

function getNodeUri() {
	return $("#nodeURI").val();
}

function loadTemplate(that) {
	let storedTemplate = getStorageJSON(getNodeUri());
	if (!storedTemplate) return;

	let template = Template.create();
	template.fromJSON(storedTemplate);
	that.set("template", template);
}
