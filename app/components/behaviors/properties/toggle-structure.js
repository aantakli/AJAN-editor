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
import { ND, RDF } from "ajan-editor/helpers/RDFServices/vocabulary";
import rdfTree from "ajan-editor/helpers/RDFServices/manager/tree";
import generator from "ajan-editor/helpers/RDFServices/manager/generator";

let that = undefined;

export default Component.extend({
  classNames: ["auto-size"],
  toggleValue: true,
  oldValue: true,
  oldFirst: undefined,
  oldLast: undefined,

  didInsertElement() {
    this._super(...arguments);
    that = this;
    let quad = rdfGraph.findQuad(this.get("uri"), ND.toggle);
    this.set("toggleValue", quad.object.value === ND.First);
    this.set("oldValue", quad.object.value === ND.First);
  },

  didUpdate() {
    let quad = rdfGraph.findQuad(this.get("uri"), ND.toggle);
    if (this.get("oldValue") != this.get("toggleValue")) {
      this.set("oldValue", this.get("toggleValue"));
      if (this.get("toggleValue")) {
        quad.object.value = ND.First;
        let deleted = deleteOldToggleRDF(this.get("toggle.last"));
        console.log(deleted);
        this.set("oldLast", deleted);
        if (this.get("oldFirst") === undefined) {
          generator.generateStructure(this.get("toggle.first"), this.get("uri"), false);
        } else {
          this.get("oldFirst").forEach(quad => {
            rdfGraph.add(quad);
          })
        }
      } else {
        quad.object.value = ND.Last;
        let deleted = deleteOldToggleRDF(this.get("toggle.first"));
        console.log(deleted);
        this.set("oldFirst", deleted);
        if (this.get("oldLast") === undefined) {
          generator.generateStructure(this.get("toggle.last"), this.get("uri"), false);
        } else {
          this.get("oldLast").forEach(quad => {
            rdfGraph.add(quad);
          })
        }
      }
    }
  },
});

function deleteOldToggleRDF(obj) {
  let removed = [];
  if (obj.list.length > 0) {
    obj.list.forEach(item => {
      removed = removed.concat(removeAllRDF(that.get("uri"), item.mapping));
    })
  } else if (obj.parameters.length > 0) {
    obj.parameters.forEach(item => {
      removed = removed.concat(removeAllRDF(that.get("uri"), item.mapping));
    })
  } else if (obj.parameterSets.length > 0) {
    obj.parameterSets.forEach(item => {
      removed = removed.concat(removeAllRDF(that.get("uri"), item.mapping));
    })
  }
  console.log(removed);
  return removed;
}

function removeAllRDF(URI, predicate) {
  let removed = [];
  let quad = rdfGraph.findQuad(URI, predicate);
  if (quad != undefined) {
    let nodes = [];
    rdfTree.visitNode(quad.object.value, nodes);
    nodes.forEach(uri => {
      let quads = rdfGraph.getAllQuads(uri);
      quads.forEach(quad => {
        removed.push(quad)
      });
      rdfGraph.removeAllRelated(uri);
    });
    rdfGraph.remove(quad);
  }
  return removed;
}
