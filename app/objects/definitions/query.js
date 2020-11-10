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
import {EDITOR, RDFS} from "ajan-editor/helpers/RDFServices/vocabulary";
import StorableObject from "ajan-editor/objects/storable-object";

let Query = StorableObject.extend({
	label: "",
	description: "",
	content: "",
	tags: "",
	modified: new Date(),
	isLoading: false,

	id: computed("label", function() {
		return this.get("label");
	}),

	fieldWasModified: observer(
		"label",
		"description",
		"content",
		"tags",
		function() {
			if (this.isLoading) return;
			this.wasModified();
		}
	),

	wasModified() {
		this.set("modified", new Date());
	},

	toJSON() {
		return {
			id: this.id,
			label: this.label,
			description: this.description,
			content: this.content,
			tags: this.tags,
			modified: this.modified.toJSON()
		};
	},

	fromJSON(json) {
		this.isLoading = true;
		this.set("label", json.label);
		this.set("description", json.description);
		this.set("content", json.content);
		this.set("tags", json.tags);

		try {
			this.set("modified", new Date(json.modified));
		} catch (e) {
			this.wasModified();
		}

		this.isLoading = false;
	},

	fromJSONld(data) {
		this.isLoading = true;
		this.set("label", this.getJSONldValue(data, RDFS.label));
		this.set("description", this.getJSONldValue(data, RDFS.comment));
		this.set("content", this.getJSONldValue(data, EDITOR.content));
		this.set("tags", this.getJSONldValue(data, EDITOR.tags));
		this.set("modified", new Date(this.getJSONldValue(data, EDITOR.modified)));
		this.isLoading = false;
	},

	toTriples() {
		let resource = this.get("storageUri");
		return (
			this.produceSparqlTriplewithString(resource, EDITOR.id, this.id) +
			this.produceSparqlTriplewithString(resource, RDFS.label, this.label) +
			this.produceSparqlTriplewithString(
				resource,
				RDFS.comment,
				this.description
			) +
			this.produceSparqlTriplewithString(
				resource,
				EDITOR.content,
				this.content
			) +
			this.produceSparqlTriplewithString(resource, EDITOR.tags, this.tags) +
			this.produceSparqlTriplewithString(
				resource,
				EDITOR.modified,
				this.modified.toDateString()
			)
		);
	}
});

export {Query};
