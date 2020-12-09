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
import {computed,observer} from "@ember/object";
import Component from "@ember/component";
import {
  targetDefault,
  targets
} from "ajan-editor/helpers/constants/query-targets";
import rdfGraph from "ajan-editor/helpers/RDFServices/RDF-graph";
import rdfFact from "ajan-editor/helpers/RDFServices/RDF-factory";

export default Component.extend({
  targets: targets,
  selected: undefined,

  selectedBaseValue: computed("selected", function () {
    let baseValue = getBase(this.get("uri"), this.get("structure.mapping"));
    if (!baseValue || baseValue === "http://") {
      var node = rdfFact.toNode(targetDefault.value);
      this.set("selected", node);
      return rdfFact.toNode(node);
    }
    return rdfFact.toNode(baseValue);
  }),

  baseValueChanged: observer("selected", function () {
    this.set("selected", this.selected);
    setBase(this.get("uri"), this.get("structure.mapping"), this.selected);
  }),

  uriChange: observer("uri", function () {
    let baseValue = getBase(this.get("uri"), this.get("structure.mapping"));
    if (!baseValue || baseValue === "http://") {
      baseValue = rdfFact.toNode(targetDefault.value);
    }
    this.set("selected", baseValue);
  })
});

function getBase(uri, basePredicate) {
  return rdfGraph.getObjectValue(uri, basePredicate) || "";
}

function setBase(uri, basePredicate, value) {
  rdfGraph.setObject(uri, basePredicate, rdfFact.toNode(value));
}
