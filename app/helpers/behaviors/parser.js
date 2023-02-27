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
import graphGen from "ajan-editor/helpers/graph/graph-generator";
import nodeDefs from "ajan-editor/helpers/RDFServices/node-definitions/node-defs";

function createNode(nodeData) {
	let name =
		typeof nodeData.name == "string" ? nodeData.name : nodeData.name.value;
	let meta = nodeDefs.getMetaData(name, nodeData.category);
	return graphGen.node(nodeData.id, name, nodeData.uri, meta.class, meta.type);
}

// TODO: Adapt this for behavior trees
export default {
	behavior2cy: function(data) {
		//TODO: data might consist of several trees
		//console.log('data', data);
		let graph = {
			nodes: [],
			edges: []
		};
		graph.nodes.push(createNode(data));
		let edge = graphGen.edge(data.id, data.root);
		if (!(data.nodes.length == 0 || (data.nodes.length == 1 && !data.nodes[0])))
			graph.edges.push(edge);

		// get all the nodes
    data.nodes.forEach(nd => {
			if (nd) {
				// Register as node
        graph.nodes.push(createNode(nd));
				// Register children
				if (nd.children) {
					nd.children.forEach(child => {
						let edge = graphGen.edge(nd.id, child);
						graph.edges.push(edge);
					});
				}
				if (nd.child) {
					let edge = graphGen.edge(
						nd.id,
						typeof nd.child === "string" ? nd.child : nd.child.value
					);
					graph.edges.push(edge);
				}
			}
		});

		//console.log('The graph', graph);
		return graph;
	}
};
