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
import graphUtil from "ajan-editor/helpers/graph/utility";
import rdfGraph from "ajan-editor/helpers/RDFServices/RDF-graph";
import {RDFS} from "ajan-editor/helpers/RDFServices/vocabulary";
import Service from "@ember/service";

export default Service.extend({
	updateLabel(node) {
		updateGraphNodeLabel(node);
		rdfGraph.setObjectValue(node.uri, RDFS.label, node.label);
	},

	updateDescription(node) {
		rdfGraph.setObjectValue(node.uri, RDFS.comment, node.description);
  },

  getNode(comp) {
    return graphUtil.getNode(comp);
  },

  checkDouplePrefixes(query) {
    return graphUtil.checkDouplePrefixes(query);
  },

  updateErrorVisulization(comp, error) {
    graphUtil.updateErrorsList(comp, error);
  },

  validateEventGoalActionField(comp, error) {
    graphUtil.validateEventGoalActionField(comp, error);
  }
});

function updateGraphNodeLabel(node) {
	node.node.data("label", node.label);
	graphUtil.setNodeDimensions(node.node);
}
