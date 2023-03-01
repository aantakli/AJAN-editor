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
import {ND, BT, XSD} from "ajan-editor/helpers/RDFServices/vocabulary";
import Component from "@ember/component";
import rdfGraph from "ajan-editor/helpers/RDFServices/RDF-graph";

export default Component.extend({
	classNames: ["behavior", "side-pane", "container", "parameter"],

	type: computed("uri", "parameter", function() {
		let type = this.get("parameter.input");
		switch (type) {
			case XSD.long:
			case XSD.int:
				return {integer: true};
			case XSD.boolean:
				return {boolean: true};
			case XSD.anyURI:
				return {uri: true};
			case XSD.string:
        return { string: true };
      case ND.textarea:
        return { textarea: true };
			case XSD.float:
			case XSD.double:
				return {float: true};
			case ND.Query:
        return { query: true };
      case ND.ACTNDef:
        return { actndef: true };
      case ND.Repo:
        return { repo: true };
      case ND.Event:
        return { event: true };
      case ND.Goal:
        return { goal: true };
      case ND.EventGoal:
        return { eventgoal: true };
			default:
				console.warn("Unknown parameter type", type);
				return {};
		}
  }),

  uriChange: observer("uri", function () {
    this.set("value", getValue(this));
  }),

  value: computed("uri", "parameter", function () {
		return getValue(this);
	}),

  valueChanged: observer("value", function () {
    let type = this.get("type");
    let value = this.get("value");
    if (type.textarea) {
      if (!value.endsWith('\n')) {
        console.log("Add EOF in textarea");
        value = value + '\n';
      }
    }
		rdfGraph.setObjectValue(
			this.get("uri"),
			this.get("parameter").mapping,
      value
		);
	})
});

function getValue(that) {
  let parameter = that.get("parameter");

  let value = rdfGraph.getObjectValue(that.get("uri"), parameter.mapping);
	if (!value && typeof value !== "boolean")
		console.warn(
			"Value not defined, using default",
			that.get("uri"),
      parameter
    );
  return value || parameter.default;
}
