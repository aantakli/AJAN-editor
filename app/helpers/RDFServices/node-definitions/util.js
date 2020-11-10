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
import {RDF} from "ajan-editor/helpers/RDFServices/vocabulary";

export default {
	existsSome,
	findQuad,
	getObjectValue,
	findAllQuads,
	traverseList,
	getObjectValues
};

function existsSome(quads, value) {
	return quads.some(quad => {
		return (
			quad.subject.value === value ||
			quad.predicate.value === value ||
			quad.object.value === value
		);
	});
}

// Subject, predicate, object, graph
function findQuad(quads, s, p, o, g) {
	return quads._quads.find(quad => {
		return (
			(s ? quad.subject.value === s : true) &&
			(p ? quad.predicate.value === p : true) &&
			(o ? quad.object.value === o : true) &&
			(g ? quad.graph.value === g : true)
		);
	});
}

// Subject, predicate, object, graph
function findAllQuads(quads, s, p, o, g) {
	return quads._quads.filter(quad => {
		return (
			(s ? quad.subject.value === s : true) &&
			(p ? quad.predicate.value === p : true) &&
			(o ? quad.object.value === o : true) &&
			(g ? quad.graph.value === g : true)
		);
	});
}

function getObjectValue(quads, s, p) {
	try {
		return findQuad(quads, s, p).object.value;
	} catch (error) {
		//console.warn('Could not find target quad: ', s, p);
	}
}

function getObjectValues(quads, s, p) {
	let values = [];
	let matchedQuads = findAllQuads(quads, s, p);
	try {
		matchedQuads.forEach(quad => values.push(quad.object.value));
	} catch (error) {
		//
	}
	return values;
}

// Goes through a RDF list, updating elements[] with URIs of each list element (blank node)
function traverseList(quads, currentURI, elements) {
	elements.push(getObjectValue(quads, currentURI, RDF.first));
	let nextURI = getObjectValue(quads, currentURI, RDF.rest);
	if (nextURI && nextURI !== RDF.nil) {
		traverseList(quads, nextURI, elements);
	}
}
