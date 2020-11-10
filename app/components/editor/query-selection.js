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
import Ember from "ember";
import {inject} from "@ember/service";

let $ = Ember.$;

export default Component.extend({
	classNames: ["full-height"],
	queryInsertion: inject("behaviors/query-insertion-manager"),

	nodeType: computed("queryInsertion.nodeType", function() {
		return this.get("queryInsertion.nodeType");
	}),

	actions: {
		clickedTab(tab) {
			setDefaultTabs(this);
			this.set("tabs." + tab, true);
		},
		onQueryLoad(that, id, row) {
			let data = row.get("data");
			this.set("query", data.content);
			this.set("queryValue", data.content);
			$("#modal-query-insertion-confirm").click();
		}
	}
});

function setDefaultTabs(that) {
	that.set("tabs.template", false);
	that.set("tabs.transformToSparql", false);
	that.set("tabs.loadQuery", false);
	that.set("tabs.newSparql", false);
}
