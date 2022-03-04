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
import fetch from "./fetch";
import initNodes from "./init";
import {ND} from "ajan-editor/helpers/RDFServices/vocabulary";
import ndList from "./list";
import ndParameter from "./parameter";
import ndParameters from "./parameters";
import ndParameterSet from "./parameter-set";
import ndStyle from "./style";
import nodeDefs from "./node-defs";
import util from "./util";

export default function(ajax, cy) {
	// Request Node Definitions from server
	let nodeDefPromise = fetch(ajax);
	return Promise.resolve(nodeDefPromise).then(function(data) {
		// Start parsing
		nodeDefs.reset();
		identifyNodes(data);
		if (cy != null) {
			initNodes(cy);
		}
	});
}



// Find nodes
function identifyNodes(quads) {
	quads.forEach(quad => {
		if (quad.predicate.value === ND.class && quad.object.value === ND.Leaf) {
			//console.log('Found leaf: ', quad.subject.value);
			buildNode(quads, quad.subject.value, "Leaf");
		} else if (
			quad.predicate.value === ND.class &&
			quad.object.value === ND.Composite
		) {
			//console.log('Found composite: ', quad.subject.value);
			buildNode(quads, quad.subject.value, "Composite");
		} else if (
			quad.predicate.value === ND.class &&
			quad.object.value === ND.Decorator
		) {
			//console.log('Found decorator: ', quad.subject.value);
			buildNode(quads, quad.subject.value, "Decorator");
		} else if (
			quad.predicate.value === ND.class &&
			quad.object.value === ND.Root
		) {
			//console.log('Found root: ', quad.subject.value);
			buildNode(quads, quad.subject.value, "Root");
		} else if (
			quad.predicate.value === ND.class &&
			quad.object.value === ND.BehaviorTree
		) {
			//console.log('Found decorator: ', quad.subject.value);
			buildNode(quads, quad.subject.value, "BehaviorTree");
		}
	});
}

// For each node, build structure and style
function buildNode(quads, nodeURI, nodeClass) {
	// The node's style in cytoscape
	let style = ndStyle(quads, nodeURI);
	let fixedLabel =
		util.findQuad(quads, nodeURI, ND.labelType).object.value === ND.Fixed;
	// Structure of the RDF representation
	let structure = buildStructure(quads, nodeURI);
	let typeQuad = util.findQuad(quads, nodeURI, ND.type);
	//TODO: What if type is undefined (e.g. for decorators?)
  let type = typeQuad ? typeQuad.object.value : "";
  let categoryStmt = util.findQuad(quads, nodeURI, ND.category);
  let category;
  if (categoryStmt) {
    category = categoryStmt.object.value;
  }

	// Properties fields for the details panel
	// Properties could be infered from the structure
	//let properties;
	//TODO: Also consider class(Composite, Decorator, Leaf) and name for the "Add node" panel
	//TODO: Rename type to class? (not nodeURI!!!!!)
  let title = util.findQuad(quads, nodeURI, ND.name).object.value;
	let nodeDef = {
		id: title.replace(/ /g, ""),
		title,
    class: nodeClass,
    category: category,
		type,
		structure,
		style,
		fixedLabel
	};

	// Store the Node Definition
	nodeDefs.push(nodeDef);
}

function buildStructure(quads, nodeURI) {
	let lists = [];
	let parameters = [];
	let parameterSets = [];
	quads.forEach(quad => {
		if (quad.subject.value === nodeURI) {
			let objURI = quad.object.value;
			switch (quad.predicate.value) {
				case ND.parameter:
					parameters.push(ndParameter(quads, objURI));
					break;
				case ND.parameters:
					parameters = parameters.concat(ndParameters(quads, objURI));
					break;
				case ND.parameterSet:
					parameterSets.push(ndParameterSet(quads, objURI));
					break;
				case ND.list:
					lists.push(ndList(quads, objURI));
					break;
				default:
					break;
			}
		}
	});
	return {
		parameters: parameters,
		parameterSets: parameterSets,
		lists: lists
	};
}

//TODO: also define default root inside node-defs.js
