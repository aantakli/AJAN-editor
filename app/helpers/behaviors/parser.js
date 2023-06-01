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
	behavior2cy: function(data, states) {
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
        let node = createNode(nd);
        if (states && node.data && node.data.uri) {
          let state = states.filter(item => item.defined === node.data.uri);
          setNodeState(state[0].state, node);
        }
        graph.nodes.push(node);
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

function setNodeState(state, node) {
  if (state) {
    switch (state) {
      case "FRESH":
        node.style = nodeFresh();
        break;
      case "SUCCEEDED":
        node.style = nodeSuccseeded();
        break;
      case "FAILED":
        node.style = nodeFailed();
        break;
      case "RUNNING":
        node.style = nodeRunning();
        break;
      default:
        node.style = nodeFresh();
        break;
    }
  }
}

function nodeFresh() {
   return { "border-color": "#000" };
}

function nodeSuccseeded() {
  return {
    "border-color": "#32a852",
    "border-width": "7px"
  };
}

function nodeFailed() {
  return {
    "border-color": "#a83232",
    "border-width": "7px"
  };
}

function nodeRunning() {
  return {
    "border-color": "#325ca8",
    "border-width": "7px"
  };
}
