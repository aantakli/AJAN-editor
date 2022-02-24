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
import rdfFact from "ajan-editor/helpers/RDFServices/RDF-factory";
import rdfGraph from "ajan-editor/helpers/RDFServices/RDF-graph";

export default {
	getEnd,
	getTailSubjectValue,
	getElements,
	getBlankElements,
	remove,
	removeAt,
	removeListItem,
	insertBehind: insertBehind,
	pushBlankNode,
	traverse
};

function getElements(s, p) {
	let elements = [];
	let quad = rdfGraph.findQuad(s, p);
	if (quad) traverse(quad.object.value, elements);
	return elements;
}

function getBlankElements(head) {
	let elements = [];
	traverseForBlanks(head, elements);
	return elements;
}

function pushBlankNode(parentURI, listPredicate) {
	let listHead = rdfGraph.getObjectValue(parentURI, listPredicate);
	if (!listHead || listHead === RDF.nil) {
		if (listHead === RDF.nil)
			rdfGraph.remove(rdfGraph.findQuad(parentURI, listPredicate, RDF.nil));
		return createNewListHead(parentURI, listPredicate);
	}
	let blankNode = rdfFact.blankNode();
	let newListTail = insertBehind(blankNode, getTailSubjectValue(listHead));
	return {blankNode, tailURI: newListTail};
}

function createNewListHead(parentURI, listPredicate) {
	let blankNode = rdfFact.blankNode();
	let listPointer = rdfFact.blankNode();
	rdfGraph.add(
		rdfFact.quad(rdfGraph.getNode(parentURI), listPredicate, listPointer)
	);
	rdfGraph.add(rdfFact.quad(listPointer, RDF.first, blankNode));
	rdfGraph.add(rdfFact.quad(listPointer, RDF.rest, RDF.nil));
	return {blankNode, tailURI: listPointer.value};
}

//TODO: rename to push
function insertBehind(insertNode, atURI) {
	let blankNode = rdfFact.blankNode();
  let nextQuad = rdfGraph.findQuad(atURI, RDF.rest);
  console.log(atURI);
  console.log(nextQuad);
	let nextNode = nextQuad.object;
	nextQuad.object = blankNode;
	//rdfGraph.add(rdfFact.quad(blankNode, RDF.type, RDF.List));
	rdfGraph.add(rdfFact.quad(blankNode, RDF.first, insertNode));
	rdfGraph.add(rdfFact.quad(blankNode, RDF.rest, nextNode));
	return blankNode.value;
}

function traverse(currentURI, elements) {
	let ele = rdfGraph.findQuad(currentURI, RDF.first);
	if (ele) {
		elements.push(ele.object);
		//elements.push(ele);
	}
	let restQuad = rdfGraph.findQuad(currentURI, RDF.rest);
	if (!restQuad) return;
	if (restQuad.object.value !== RDF.nil)
		traverse(restQuad.object.value, elements);
}

function traverseForBlanks(currentURI, elements) {
	elements.push(currentURI);
	let restQuad = rdfGraph.findQuad(currentURI, RDF.rest);
	if (!restQuad) return;
	if (restQuad.object.value !== RDF.nil)
		traverseForBlanks(restQuad.object.value, elements);
}

// Go through rdf:rest until we found rdf:nil as object
function getEnd(currentURI) {
	//TODO: handle cycle in graph?
	let found = rdfGraph.findQuad(currentURI, RDF.rest);
	if (!found) return undefined;
	else if (found.object.value === RDF.nil) return found;
	else return getEnd(found.object.value);
}

function getTailSubjectValue(currentURI) {
	try {
		return getEnd(currentURI).subject.value;
	} catch (error) {
		return;
	}
}

// targetURI: remove this element from list
// currentURI: current position in list (blank node)
// returns the referenced list element (not the blank node)
function remove(targetURI, currentURI) {
	//TODO: handle cycle in graph?
	//TODO: check whether params are viable?
	let next = rdfGraph.findQuad(currentURI, RDF.rest);
	if (!next) {
		console.error("Could not find next element in RDF:List");
		return undefined;
	}
	let target_ = rdfGraph.findQuad(currentURI, RDF.first, targetURI);
	// If such a quad exists
	if (target_) {
		// Get previous
		let prev = rdfGraph.findQuad("", RDF.rest, currentURI);
		if (!prev) {
			// Special case: First node in list
			prev =
				rdfGraph.findQuad("", BT.hasChildren, currentURI) ||
				rdfGraph.findQuad("", BT.hasChild, currentURI);
		}
		// Set previous.rest to next
		prev.object = next.object;
		// Delete the blank node
		rdfGraph.removeQuad(target_);
		//TODO: Remove next?
		//rdfGraph.removeQuad(next);
		//
		return target_;
	}
	if (next.object.value === RDF.nil) return undefined;
	return remove(targetURI, next.object.value);
}

// targetURI: remove this element from list
// currentURI: current position in list (blank node)
// returns the removed qud
function removeAt(currentObj, index) {
	//TODO: check whether params are viable?
	let next = rdfGraph.findQuad(currentObj, RDF.rest);
	if (!next) {
		console.error("Could not find next element in RDF:List");
		return undefined;
	}
	if (index > 0) {
		return removeAt(next.object.value, --index);
	}

	let target_ = rdfGraph.findQuad(currentObj, RDF.first);
	// let targetURI = target_.object.value;
	// If such a quad exists
  if (target_) {
		// Get previous
    let prev = rdfGraph.findQuad("", RDF.rest, currentObj);
		if (!prev) {
			// Special case: First node in list
			prev =
				rdfGraph.findQuad("", BT.hasChildren, currentObj) ||
				rdfGraph.findQuad("", BT.hasChild, currentObj);
		}
		// Set previous.rest to next
    prev.object = next.object;

		// Delete the blank node
    rdfGraph.removeAllRelated(target_.subject.value);
		return target_;
  }
	if (next.object.value === RDF.nil) return undefined;
}

function removeListItem(pointerURI) {
  console.log(pointerURI)
  let first = rdfGraph.findQuad(pointerURI, RDF.first).object;
	bendListItemPointer(pointerURI);
  rdfGraph.removeAllRelated(pointerURI);
  rdfGraph.removeAllRelated(first.value);
}

function bendListItemPointer(pointerURI) {
	let next = rdfGraph.findQuad(pointerURI, RDF.rest).object;
	let previous = rdfGraph.findQuad("", "", pointerURI);
	previous.object = next;
	return pointerURI;
}
