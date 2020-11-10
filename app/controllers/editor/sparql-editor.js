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
import {computed} from "@ember/object";
import Controller from "@ember/controller";
import {Range} from "ember-ace";

export default Controller.extend({
	init() {
		this._super(...arguments);
		this.set("mode", "ace/mode/sparql");
	},

	value: "one two three\nfour five six\nseven eight nine",

	highlightActiveLine: false,
	showPrintMargin: true,
	readOnly: false,

	tabSize: 2,
	useSoftTabs: true,
	wrap: true,
	showInvisibles: true,
	showGutter: true,

	theme: "ace/theme/chaos",
	themes: ["ace/theme/textmate", "ace/theme/ambiance", "ace/theme/chaos"],

	overlay: {
		type: "warning",
		text: "by the way",
		range: new Range(0, 4, 0, 7)
	},

	overlays: computed(
		"overlay.{type,text}",
		"overlay.range.{start,end}.{row,column}",
		function() {
			return [this.get("overlay")];
		}
	),

	actions: {
		suggestCompletions(editor, session, position, prefix) {
			return [
				{
					value: prefix + "111",
					snippet: "one",
					meta: "MetaOne",
					caption: "The one",
					score: 1
				},
				{
					value: prefix + "222",
					snippet: "two",
					meta: "MetaTwo",
					caption: "The two",
					score: 2
				}
			];
		}
	}
});
