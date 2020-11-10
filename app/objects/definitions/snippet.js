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
import {EDITOR, RDFS} from "ajan-editor/helpers/RDFServices/vocabulary";
import {computed} from "@ember/object";
import StorableObject from "ajan-editor/objects/storable-object";

let Snippet = StorableObject.extend({
	label: "",
	description: "",
	shorthand: "",
	replacement: "",

	id: computed("shorthand", function() {
		return this.get("shorthand");
	}),

	toJSON() {
		return {
			id: this.id,
			label: this.label,
			description: this.description,
			shorthand: this.shorthand,
			replacement: this.replacement
		};
	},

	fromJSON(json) {
		this.label = json.label;
		this.description = json.description;
		this.shorthand = json.shorthand;
		this.replacement = json.replacement;
	},

	fromJSONld(data) {
		this.label = decodeURI(data[RDFS.label][0]["@value"]);
		this.description = decodeURI(data[RDFS.comment][0]["@value"]);
		this.shorthand = decodeURI(data[EDITOR.shorthand][0]["@value"]);
		this.replacement = decodeURI(data[EDITOR.replacement][0]["@value"]);
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
				EDITOR.shorthand,
				this.shorthand
			) +
			this.produceSparqlTriplewithString(
				resource,
				EDITOR.replacement,
				this.replacement
			)
		);
	}
});

export {Snippet};
