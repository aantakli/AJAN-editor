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
import {BT, RDF, RDFS} from "ajan-editor/helpers/RDFServices/vocabulary";
import JsonLdParser from "npm:rdf-parser-jsonld";
import nodeDefs from "ajan-editor/helpers/RDFServices/node-definitions/node-defs";
import rdf from "npm:rdf-ext";
import stringToStream from "npm:string-to-stream";
import util from "ajan-editor/helpers/RDFServices/utility";

let parser = new JsonLdParser();

export default {
	getBehaviorsGraph: getBehaviorsGraph
};

//TODO: Replace graph parameter in methods by call to singleton
// BODY

// Use this to parse data for behavior
// Request the entire graph
function getBehaviorsGraph(data) {
	const quadStream = parser.import(stringToStream(JSON.stringify(data)));

	let obj = rdf
		.dataset()
		.import(quadStream)
		.then(function(dataset) {
			// Dataset is array of quads
			let behaviors = new Array();
			getBehaviors(dataset, behaviors);
			return [behaviors, dataset];
		});
	return Promise.resolve(obj);
}

// for ?x http://www.w3.org/1999/02/22-rdf-syntax-ns#type http://www.ajan.de/behavior/bt-ns#BehaviorTree
function getBehaviors(graph, behaviors) {
	Promise.resolve(graph).then(function(graph) {
		graph.forEach(quad => {
			if (
				quad.predicate.value === RDF.type &&
				quad.object.value === BT.BehaviorTree
			) {
				behaviors.push(getBehaviorDefinitions(graph, quad.subject));
			}
		});
	});
}

// Parse the behavior node
function getBehaviorDefinitions(graph, resource) {
	let behavior = {};
	behavior.id = util.generateUUID();
	behavior.nodes = new Array();
  behavior.name = "BT";
	behavior.category = "tree";
	behavior.uri = resource.value;
	graph.forEach(function(quad) {
		if (quad.subject.equals(resource)) {
			if (quad.predicate.value === BT.hasChild) {
				let nodeID = util.generateUUID();
				behavior.root = nodeID;
				getNodeDefinition(nodeID, graph, quad.object, behavior);
			} else if (quad.predicate.value === RDFS.label) {
				behavior.name = quad.object.value;
			}
		}
	});
	return behavior;
}

// Actually builds the tree
function getChildNodes(graph, node, behavior, children) {
	graph.forEach(function(quad) {
		if (quad.subject.equals(node)) {
			if (quad.predicate.value === RDF.first) {
				let nodeID = util.generateUUID();
				children.push(nodeID);
				getNodeDefinition(nodeID, graph, quad.object, behavior);
			} else if (
				quad.predicate.value === RDF.rest &&
				!(quad.object.value === RDF.nil)
			) {
				getChildNodes(graph, quad.object, behavior, children);
			}
		}
	});
}

function getNodeDefinition(nodeID, graph, resource, behavior) {
	graph.forEach(function(quad) {
		if (quad.subject.equals(resource)) {
			if (quad.predicate.value === RDF.type) {
				// Match the node to its definition
				let match = nodeDefs.match(quad.object.value);
				if (!match) {
					match = {};
					match.class = quad.object.value;
				}
				let node;
				switch (match.class) {
					case "Decorator":
						node = createDecoratorNode(
							nodeID,
							graph,
							resource,
							behavior,
							match.id,
							quad.subject.value
						);
						break;
					case "Composite":
						node = createCompositeNode(
							nodeID,
							graph,
							resource,
							behavior,
							match.id,
							quad.subject.value
						);
						break;
					case "BehaviorTree":
					case "Leaf":
						node = createLeafNode(
							nodeID,
							graph,
							resource,
							match.id,
							quad.subject.value
						);
						break;
					case "Root":
						break;
					default:
						console.warn("Unexpected node class: ", match.class);
						node = createUndefinedNode(
							nodeID,
							graph,
							resource,
							behavior,
							"",
							quad.subject.value
						);
				}
				if (!node) return;
				behavior.nodes.push(node);
			}
		}
	});
}

function createUndefinedNode(nodeID, graph, resource, behavior, name, subject) {
	let node = {};
	node.id = nodeID;
	node.uri = subject;
	node.category = "undefined";
	node.name = name;
	node.description = "";
	return node;
}

function createDecoratorNode(nodeID, graph, resource, behavior, name, subject) {
	let node = {};
	node.child = getChild(graph, resource, behavior);
	node.id = nodeID;
	node.uri = subject;
	node.category = "decorator";
	node.name = name;
	return node;
}

function getChild(graph, resource, behavior) {
	let nodeID = "";
	graph._quads.find(quad => {
		if (
			quad.subject.equals(resource) &&
			quad.predicate.value === BT.hasChild &&
			quad.object.value !== RDF.nil
		) {
			nodeID = util.generateUUID();
			getNodeDefinition(nodeID, graph, quad.object, behavior);
			return true;
		}
	});
	return nodeID;
}

function createCompositeNode(nodeID, graph, resource, behavior, name, subject) {
	let node = {};
	node.name = name;
	node.children = new Array();
	node.id = nodeID;
	node.uri = subject;
	node.category = "composite";

	let childRoot = "";
	graph._quads.find(quad => {
		if (
			quad.predicate.value === BT.hasChildren &&
			quad.subject.equals(resource)
		) {
			childRoot = quad.object;
			return true;
		}
	});
	getChildNodes(graph, childRoot, behavior, node.children);

	return node;
}

function createLeafNode(nodeID, graph, resource, category, subject) {
	let node = {};
	node.id = nodeID;
	node.uri = subject;
	node.category = category;

	// Get label (i.e. name)
	graph._quads.find(quad => {
		if (quad.subject.equals(resource) && quad.predicate.value === RDFS.label) {
			node.name = quad.object;
			return true;
		}
	});
	// If not found, extract the name from the node URI
	if (!node.name) {
		node.name = util.cutPrefix(resource.value);
	}

	return node;
}
