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
import {BT, RDF} from "ajan-editor/helpers/RDFServices/vocabulary";
import rdf from "npm:rdf-ext";
import rdfFact from "ajan-editor/helpers/RDFServices/RDF-factory";
import rdfGraph from "ajan-editor/helpers/RDFServices/RDF-graph";
import rdfList from "ajan-editor/helpers/RDFServices/manager/list";
import rdfUtil from "ajan-editor/helpers/RDFServices/manager/util";

export default {
	insertChild,
	removeChild,
	removeChildAt,
	reorderChildren,
	getChild
};

// Returns blank child at given index
function getChild(parentURI, index) {
	if (rdfUtil.parentHasSingleChild(parentURI))
		return rdfGraph.getObject(parentURI, BT.hasChild);

	let next = rdfGraph.getObject(parentURI, BT.hasChildren);
	for (let i = index; i > 0; i--) {
		next = rdfGraph.getObject(next.value, RDF.rest);
	}
	return next;
}

function insertChild(parentURI, childURI) {
	let child = rdfFact.toNode(childURI);

	if (rdfUtil.parentHasSingleChild(parentURI)) {
		let quad = rdfGraph.findQuad(parentURI, BT.hasChild);
		if (quad) {
			// "Child" quad already exists, update it
			quad.object = child;
		} else {
			// "Child" quad does not exists, create it
			rdfGraph.add(rdfFact.quad(parentURI, BT.hasChild, child));
		}
	} else {
		// Find parent
		let parentQuad = rdfGraph.findQuad(parentURI, BT.hasChildren);
		let lastQuad = parentQuad
			? rdfList.getEnd(parentQuad.object.value)
			: undefined;

		if (!lastQuad) {
			//TODO: Most likely: Special case: no children found -> create them
			console.warn("No children found");
			lastQuad = rdfFact.quad(parentURI, BT.hasChildren, "");
			rdfGraph.add(lastQuad);
		}
		// Generate the list item
		let newQuads = rdfFact.generateListItem(childURI);
		// Append it to current list
		lastQuad.object = newQuads[0].subject;
		rdfGraph.addAll(newQuads);
	}
}

function removeChild(parentURI, childURI) {
	//TODO: store disconnected node somewhere? so it can completely be deleted on save if no references exist.

	//console.log(graph);
	//TODO: Case handling: parent is root? -> child or children?
	let parentTypes = rdfGraph.getTypes(parentURI);

	if (parentTypes.includes(BT.Root)) {
		let quad = rdfGraph.findQuad(parentURI, BT.hasChild, childURI);
		if (quad) {
			// remove reference
			quad.object = rdf.namedNode(RDF.nil);
		}
	} else {
		// Find in list and change prev.rest to this.rest
		// Find parent
		let parentQuad = rdfGraph.findQuad(parentURI, BT.hasChildren);
		if (parentQuad) {
			rdfList.remove(childURI, parentQuad.object.value);
		}
	}
}

function removeChildAt(parentURI, index) {
	//TODO: Case handling: parent is root? -> child or children?
  if (index == undefined || index == null || index < 0) return;
	let parentTypes = rdfGraph.getTypes(parentURI);
	console.log("parentTypes", parentTypes);
	console.log("delete ", parentURI, index);
	// Find in list and change prev.rest to this.rest
	// Find parent
	let parentQuad = rdfGraph.findQuad(parentURI, BT.hasChildren);
	if (parentQuad) {
		rdfList.removeAt(parentQuad.object.value, index);
		return;
	}
}

function reorderChildren(parentURI, childList) {
  if (childList.length <= 1) {
    let hasChildrenQuad = rdfGraph.findQuad(parentURI, BT.hasChildren);
    if (hasChildrenQuad && hasChildrenQuad.object.value === RDF.nil) {
      rdfGraph.remove(hasChildrenQuad);
    }
    return;
  }
	// For each child, get its blank node representing the element in the list
	// rely on bt:hasChildren of parent to get first child
	// based on first child, use list.getBlankElements to get all the other child blank nodes
	// map children from childList to their respective blank node
	let head = rdfGraph.getObjectValue(parentURI, BT.hasChildren);
	let bl = rdfList.getBlankElements(head);
	let childData = [];
	childList.forEach(child => {
		childData.push({child: child, blank: undefined});
	});
	// pop node from bl, an attach it to matching child
	// make sure not to assign the same child to several blankies, or vice versa
	while (bl.length > 0) {
		let popped = bl.pop();
		childData.find(child => {
			if (child.blank) return false; // Already defined
			if (rdfGraph.findQuad(popped, RDF.first, child.child)) {
				child.blank = rdf.blankNode(popped);
				return true;
			}
		});
	}
	// Reorder / reconstruct the list according to the NEW order
  childData.forEach((ele, index) => {
    let toNext = undefined;
    if (ele.blank != undefined) {
      toNext = rdfGraph.findQuad(ele.blank.value, RDF.rest);
      if (index >= childData.length - 1) {
        // Last blanky has no successor: Point to Nil
        toNext.object = rdf.namedNode(RDF.nil);
        return;
      }
      toNext.object = childData[index + 1].blank;
    }
  });
  
	// Direct the parent's BTChildren pointer to the first blanky in the list
	let childrenPointer = rdfGraph.findQuad(parentURI, BT.hasChildren);
	if (childrenPointer) {
		childrenPointer.object = childData[0].blank;
	}
}
