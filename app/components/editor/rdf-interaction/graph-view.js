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
import { computed, observer } from "@ember/object";
import Component from "@ember/component";
import 'cytoscape-rdf';

export default Component.extend({
  classNames: ["auto-size full-width"],
  toManyStatements: false,

  didInsertElement() {
    setGraph(this);
  },

  modeChanged: observer("mode", "dataFormat", "data", "malformedQuery", function () {
    if (this.get("malformedQuery")) {
      emptyGraph(this);
      return;
    }
    if (!this.get("data")) {
      emptyGraph(this);
      return;
    }

    switch (this.get("mode")) {
      case "all":
        emptyGraph(this);
        setGraph(this);
        break;
      case "where":
        emptyGraph(this);
        setGraph(this);
        break;
      case "query":
        if (this.get("dataFormat") === "RDF") {
          emptyGraph(this);
          setGraph(this);
        }
        else emptyGraph(this);
        break;
      case "none":
      default:
        emptyGraph(this);
    }
  }),

  actions: {

	}
});

function setGraph(self) {
  try {
    self.set("toManyStatements", false);
    $("#rdf-graph-view").append("<cytoscape-rdf id='cytoscapeNanopub' rdf='" + getRDF4Graph(self) + "' />");
  } catch (e) {
    self.set("toManyStatements", true);
  }
}

function getRDF4Graph(self) {
  let rdf = self.get("data");
  let prefixes = "";
  self.get("prefixes").forEach(entry => {
    prefixes += "@prefix " + entry.label + " <" + entry.iri + "> . ";
  });
  let defaultGraph = self.get("currentRepository");
  rdf = rdf.replaceAll('{', " <" + defaultGraph + "> { ");
  return prefixes + rdf;
}

function emptyGraph(self) {
  self.set("toManyStatements", false);
  $("#rdf-graph-view").empty();
}
