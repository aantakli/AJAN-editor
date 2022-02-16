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
import globals from "ajan-editor/helpers/global-parameters";
import rdfDestr from "ajan-editor/helpers/RDFServices/manager/destructor";
import rdfClone from "ajan-editor/helpers/RDFServices/manager/cloneBT";
import rdfGen from "ajan-editor/helpers/RDFServices/manager/generator";
import rdfGraph from "ajan-editor/helpers/RDFServices/RDF-graph";
import rdfList from "ajan-editor/helpers/RDFServices/manager/list";
import rdfTree from "ajan-editor/helpers/RDFServices/manager/tree";
import util from "ajan-editor/helpers/RDFServices/utility";

export default {
	generateNodeData,
	generateNode: rdfGen.generateNode,
	insertChild: rdfTree.insertChild,
	removeChild: rdfTree.removeChild,
	removeChildAt: rdfTree.removeChildAt,
	getChild: rdfTree.getChild,
	reorderChildren: rdfTree.reorderChildren,
  deleteNode: rdfDestr.deleteNode,
  deleteBT: rdfDestr.deleteBT,
  exportBT: rdfTree.exportBT,
	getListObjects: rdfList.getElements,
	getListBlanks: rdfList.getBlankElements,
	getListTail: rdfList.getEnd,
	removeListItem: rdfList.removeListItem,
	getTailSubjectValue: rdfList.getTailSubjectValue,
	listInsert: rdfList.insertBehind,
	listPushBlankNode: rdfList.pushBlankNode,
	generateStructure: rdfGen.generateStructure,
  generateBT: rdfGen.generateBT,
  cloneBT: rdfClone.cloneBT
};

function generateNodeData(type) {
	//TODO: currently only for behaviors
  let baseURI = globals.baseURI;
	let label = util.camelize("default " + type);
  let label_ = label;
  let uuid = util.generateUUID();
  let uri = baseURI + type + "-" + uuid;
	let index = 1;
	// Adjust index if the same URI exists anywhere in the graph
	while (rdfGraph.existsSome(uri)) {
		label = label_ + index;
		uri = baseURI + label;
		index++;
	}
	rdfGen.generateNode(type, uri, label);

	return {
		label,
		uri
	};
}
