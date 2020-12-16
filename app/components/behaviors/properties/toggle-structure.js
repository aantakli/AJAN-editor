/*
 * Created on Tue Nov 10 2020
 *
 * The MIT License (MIT)
 * Copyright (c) 2020 André Antakli (German Research Center for Artificial Intelligence, DFKI).
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
import rdfGraph from "ajan-editor/helpers/RDFServices/RDF-graph";
import rdfTree from "ajan-editor/helpers/RDFServices/manager/tree";
import rdfFact from "ajan-editor/helpers/RDFServices/RDF-factory";
import { ND, RDF } from "ajan-editor/helpers/RDFServices/vocabulary";
import generator from "ajan-editor/helpers/RDFServices/manager/generator";

let that = undefined;

export default Component.extend({
  classNames: ["auto-size"],
  toggleValue: true,
  oldValue: true,
  oldFirst: undefined,
  oldLast: undefined,

  didReceiveAttrs() {
    this._super(...arguments);
    that = this;
    setToggleValue();
  },

  didUpdate() {
    let quad = rdfGraph.findQuad(this.get("uri"), ND.toggle);
    if (this.get("oldValue") != this.get("toggleValue")) {
      this.set("oldValue", this.get("toggleValue"));
      if (this.get("toggleValue")) {
        quad.object.value = ND.First;
        deleteOldToggleRDF(this.get("toggle.last"));
        generator.generateStructure(this.get("toggle.first"), this.get("uri"), false);
      } else {
        quad.object.value = ND.Last;
        deleteOldToggleRDF(this.get("toggle.first"));
        generator.generateStructure(this.get("toggle.last"), this.get("uri"), false);
      }
    }
  },
});

function setToggleValue() {
  let quad = rdfGraph.findQuad(that.get("uri"), ND.toggle);
  if (quad === undefined) {
    let toggle = that.get("toggle");
    let quads = rdfGraph.getAllQuads(that.get("uri"));
    quads.forEach(quad => {
      let predicate = quad.predicate.value;
      if (checkArrays(predicate, toggle.last)) {
        rdfGraph.add(rdfFact.quad(that.get("uri"), ND.toggle, ND.Last));
        that.set("toggleValue", false);
        that.set("oldValue", false);
      } else {
        rdfGraph.add(rdfFact.quad(that.get("uri"), ND.toggle, ND.First));
        that.set("toggleValue", true);
        that.set("oldValue", true);
      }
    });
  } else {
    that.set("toggleValue", quad.object.value === ND.First);
    that.set("oldValue", quad.object.value === ND.First);
  }
}

function checkArrays(predicate, toggleItem) {
  if (checkMapsTo(predicate, toggleItem.parameters)) return true;
  else if (checkMapsTo(predicate, toggleItem.parameterSets)) return true;
  else if (checkMapsTo(predicate, toggleItem.list)) return true;
  else return false;
}

function checkMapsTo(predicate, array) {
  array.forEach(item => {
    if (item.mapping === predicate) return true;
  })
  return false;
}

function deleteOldToggleRDF(obj) {
  if (obj.list.length > 0) {
    obj.list.forEach(item => {
      removeAllRDF(that.get("uri"), item.mapping);
    })
  } else if (obj.parameters.length > 0) {
    obj.parameters.forEach(item => {
      removeAllRDF(that.get("uri"), item.mapping);
    })
  } else if (obj.parameterSets.length > 0) {
    obj.parameterSets.forEach(item => {
      removeAllRDF(that.get("uri"), item.mapping);
    })
  }
}

function removeAllRDF(URI, predicate) {
  let quad = rdfGraph.findQuad(URI, predicate);
  if (quad != undefined) {
    let nodes = [];
    rdfTree.visitNode(quad.object.value, nodes);
    nodes.forEach(uri => {
      console.log(uri);
      rdfGraph.removeAllRelated(uri);
    });
    rdfGraph.remove(quad);
  }
}
