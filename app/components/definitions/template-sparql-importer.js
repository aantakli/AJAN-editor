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
import {observer} from "@ember/object";

export default Component.extend({
	classNames: ["auto-size"],

	didInsertElement() {
		let editor = ace.edit("ace-editor");
		let that = this;
		editor.getSession().on("change", function() {
			let value = editor.getValue().trim();
			if (!value) that.set("editorEmpty", true);
			else that.set("editorEmpty", false);
		});
	},

	editorEmpty: true,
	editorEmptyChange: observer("editorEmpty", function() {
		if (this.editorEmpty) Ember.$("#" + this.elementId).addClass("highlight");
		else Ember.$("#" + this.elementId).removeClass("highlight");
	}),

	showLoadModal: false,

	modalChanged: observer("showLoadModal", function() {}),

	actions: {
		load() {
			this.set("showLoadModal", true);
			Ember.$("#" + this.elementId).removeClass("highlight");
		}
	}
});
