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
import {computed, observer} from "@ember/object";
import Component from "@ember/component";
import EditorManager from "ajan-editor/helpers/sparql-editor/instance-manager";
import {Query} from "ajan-editor/objects/definitions/query";

export default Component.extend({
	queryManager: Ember.inject.service("data-manager/query-manager"),
	classNames: ["full-height"],

	tempLabelValue: computed("labelValue", function() {
		return this.get("labelValue");
	}),
	tempDescriptionValue: computed("descriptionValue", function() {
		return this.get("descriptionValue");
	}),
	tempTagValues: computed("tagValues", function() {
		return this.get("tagValues");
	}),

	showToggled: observer("show", function() {
		if (!this.get("show")) return;
		let savedQuery = EditorManager.getSave() || {};
		if (!savedQuery) return;
		this.set("labelValue", savedQuery.id);
		this.set("tempLabelValue", savedQuery.id);
		this.set("tagValues", savedQuery.tags);
		this.set("tempTagValues", savedQuery.tags);
		this.set("descriptionValue", savedQuery.description);
		this.set("tempDescriptionValue", savedQuery.description);
	}),

	actions: {
		saveAs() {
			if (!labelCheck(this.get("tempLabelValue"))) return;

			let query = createQuery(this);
			this.set("labelValue", query.id);
			return this.queryManager.save(query);
		}
	}
});

function labelCheck(label) {
	if (!label || label === "") {
		alert("Empty labels are not allowed, please enter a value");
		return false;
	}
	return true;
}

function createQuery(that) {
	let query = Query.create();
	query.set("label", that.get("tempLabelValue"));
	query.set("description", that.get("tempDescriptionValue"));
	query.set("content", ace.edit("ace-editor").getValue());
	query.set("tags", that.get("tempTagValues"));
	return query;
}
