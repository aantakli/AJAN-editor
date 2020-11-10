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
import {RDF, XSD} from "ajan-editor/helpers/RDFServices/vocabulary";
import rdf from "npm:rdf-ext";
//TODO: investigate why this import is required
import srdf from "npm:simplerdf";
import utility from "ajan-editor/helpers/RDFServices/utility";

// Module used to generate new quads
// Creating a triple will result in a quad with defaultGraph
export default {
	blankNode,
	generateListItem,
	literal,
	quad,
	quadBlank,
	quadLiteral,
	toNode
};

function quad(s, p, o) {
	return rdf.triple(toNode(s), toNode(p), toNode(o));
}

// Generate a new blank node
function blankNode() {
	return rdf.blankNode(utility.generateBlankID());
}

// Extend existing resource into a triple with a blank
function quadBlank(s, p) {
	return rdf.triple(toNode(s), toNode(p), blankNode());
}

// Generate a new quad with a literal
function quadLiteral(s, p, o, type = XSD.string) {
	let obj = o || defaultLiteralValue(type);
	obj = type === XSD.anyURI ? toNode(obj) : rdf.literal(obj, type);
	return rdf.triple(toNode(s), toNode(p), obj);
}

function literal(l, type) {
	let obj = l || defaultLiteralValue(type);
	return rdf.literal(obj, type);
}

function generateListItem(childURI) {
	// Create new blank node with predicates rdf:first child, rdf:rest rdf:nil, rdf:type rdf:List
	let child = toNode(childURI);
	let blanky = blankNode();
	let first = rdf.triple(blanky, rdf.namedNode(RDF.first), child);
	let rest = rdf.triple(
		blanky,
		rdf.namedNode(RDF.rest),
		rdf.namedNode(RDF.nil)
	);

	//TODO: Add type?
	/*let type = rdf.triple(
		blanky,
		rdf.namedNode(RDF.type),
		rdf.namedNode(RDF.List)
	);*/
	return [first, rest /*, type*/];
}

// Cast some value or node to a node
function toNode(x) {
	//TODO: better way to identify an URI
	return typeof x == "string"
		? x.startsWith("http")
			? rdf.namedNode(x)
			: rdf.blankNode(x)
		: x;
}

// Helper

function defaultLiteralValue(type) {
	switch (type) {
		case XSD.float:
		case XSD.double:
		case XSD.long:
		case XSD.int:
			return 0;
		case XSD.boolean:
			return false;
		case XSD.anyURI:
			return "http://";
		case XSD.string:
			return "";
		default:
			return "";
	}
}
