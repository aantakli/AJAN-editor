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

export default Component.extend({
	classNames: ["full-width"],

	queryMismatch: computed("template", "query", "queryValue", function() {
		if (!this.get("template") && !this.get("queryValue").trim()) return false;
		else if (!this.get("template")) return true;
		let areSame = compareQueries(
			this.get("template").toSparql({debug: false}),
			this.get("queryValue")
		);
		return !areSame;
	}),

	actions: {
		onParamValueChange() {
			let query = this.get("template").toSparql();
			this.set("query", query);
			this.set("queryValue", query);
		},

		templateRestore() {
			let template = this.get("template");
			let queryValue = (template) ? template.toSparql() : "";
			this.set("queryValue", queryValue);
		}
	}
});

function compareQueries(queryA, queryB) {
	return normalizeQuery(queryA) == normalizeQuery(queryB);
}

function normalizeQuery(query = "") {
	let string = query.toString().replace(/'/g, '"');
	string = string.replace(/\s/g, "");
	string = string.trim().normalize();
	return string;
}
