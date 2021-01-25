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
import nodeDefs from "ajan-editor/helpers/RDFServices/node-definitions/node-defs";
import rdf from "npm:rdf-ext";
import rdfGraph from "ajan-editor/helpers/RDFServices/RDF-graph";
import rdfManager from "ajan-editor/helpers/RDFServices/RDF-manager";
import rdfUtil from "ajan-editor/helpers/RDFServices/manager/util";
import rdfTree from "ajan-editor/helpers/RDFServices/manager/tree";

// Remove RDF data for a given node
export default {
  deleteNode,
  deleteBT
};

function deleteBT(nodeURI, behaviors) {
  let nodes = new Array();
  let links = {bts: new Array(), nodes: new Array()};
  rdfTree.visitNode(nodeURI, nodes);
  rdfTree.checkBTLinking(nodeURI, behaviors, links.bts);
  nodes.forEach(uri => {
    let node = {uri: uri, bts: new Array()};
    rdfTree.checkBTLinking(uri, behaviors, node.bts);
    if (node.bts.length > 0) {
      links.nodes.push(node);
    }
  });
  if (links.bts.length === 0 && links.nodes.length === 0) {
    rdfTree.visitNode(nodeURI, nodes);
    nodes.forEach(uri => {
        rdfGraph.removeAllRelated(uri);
    });
    return true;
  } else {
    let mssg = "Something went wrong, nothing has changed!";
    if (links.bts.length > 0) {
      mssg = "Behavior Tree is linked in another BT:";
      links.bts.forEach(uri => {
        mssg = mssg + " -> " + behaviors.filter(item => item.uri == uri)[0].name;
      });
    } else if (links.nodes.length > 0) {
      let node = links.nodes[0];
      mssg = "Node " + node.uri + " is linked in another BT:";
      node.bts.forEach(uri => {
        mssg = mssg + " -> " + behaviors.filter(item => item.uri == uri)[0].name;
      });
    }
    $("#error-message").trigger("showToast", [
      mssg
    ]);
    return false;
  }
}

function deleteNode(node, indegree) {
	// Case indegreeRDF == 0: delete it all
	// Case indegree >= indegreeRDF: delete it all
	// Case indegree < indegreeRDF: just change list pointer
	let parentNode = node.incomers("node").first();
	let nodeURI = node.data("uri");
	indegree = indegree || node.indegree();
	let indegreeRDF = rdfGraph.getAllQuads(undefined, RDF.first, nodeURI).length;
	if (indegreeRDF > 0 && indegree < indegreeRDF) {
		// Other references to node exist, do not delete all related data!
		// Find node in childList of parent
		let parentURI = parentNode.data("uri");
		let edges = parentNode.outgoers("edge");
		let childIndex;
		edges.forEach((edge, i) => {
			if (edge.target().same(node)) childIndex = i;
		});
		let childBlank = rdfManager.getChild(parentURI, childIndex);
		// In case parent can only have one child
		if (rdfUtil.parentHasSingleChild(parentURI)) {
			let quad = rdfGraph.findQuad(parentURI, BT.hasChild, childBlank.value);
			quad.object = rdf.namedNode(RDF.nil);
		} else if (childIndex > 0) {
			// Parent has several children
			let prevQuad = rdfGraph.findQuad(undefined, RDF.rest, childBlank.value);
			let nextQuad = rdfGraph.findQuad(childBlank.value, RDF.rest);
			prevQuad.object = nextQuad.object;
			rdfGraph.removeAllRelated(childBlank.value);
		} else if (childIndex === 0) {
			// Remove the first of several children
			let prevQuad = rdfGraph.findQuad(
				parentURI,
				BT.hasChildren,
				childBlank.value
			);
			let nextQuad = rdfGraph.findQuad(childBlank.value, RDF.rest);
			prevQuad.object = nextQuad.object;
			rdfGraph.removeAllRelated(childBlank.value);
		}
		// Stop here
		return;
	}

	console.log("Deleting ", nodeURI);
	//TODO: Special case: indegree > 1
  rdfGraph.forEach(quad => {
    // Look for child Nodes and remove the connection to them
    if (quad.subject.value === nodeURI) {
      if (quad.predicate.value === BT.hasChildren) {
        let blanky = quad.object.value;
        removeRDFListStructure(blanky);
      }
    }
		// Look for references to the node
		if (quad.object.value === nodeURI) {
      if (quad.predicate.value === RDF.first) {
        let blanky = quad.subject.value;
        let prevQuad = rdfGraph.findQuad("", RDF.rest, blanky);
        if (!prevQuad) {
          // Quad is most likely the first int the List
          // Get parent
          prevQuad = rdfGraph.findQuad("", BT.hasChildren, blanky);
          if (!prevQuad) {
            prevQuad = rdfGraph.findQuad("", BT.hasChild, blanky);
          }
        }
        let nextQuad = rdfGraph.findQuad(blanky, RDF.rest);
        prevQuad.object = nextQuad.object;
        // Also remove the blank node
        rdfGraph.removeAllRelated(blanky);
      } else {
				quad.object = rdf.namedNode(RDF.nil);
			}
		}
	});

	// Do not go any further for Root nodes
	let types = rdfGraph.getTypes(nodeURI);
	if (types.some(type => type === BT.Root)) return;
	// Remove attached parameters
	removeStructureElements(nodeURI);
	// Remove the node itself from the graph
	rdfGraph.removeMatches(rdf.namedNode(nodeURI));
}

function removeRDFListStructure(root) {
  rdfGraph.forEach(quad => {
    if (quad.subject.value === root) {
      if (quad.predicate.value === RDF.rest) {
        let blanky = quad.object.value;
        if (blanky === RDF.nil) {
          rdfGraph.removeQuad(quad);
        } else {
          rdfGraph.removeQuad(quad);
          removeRDFListStructure(blanky);
        }
      } else if (quad.predicate.value === RDF.first) {
        rdfGraph.removeQuad(quad);
      }
    }
  })
}

function removeStructureElements(nodeURI) {
	let typeQuads = rdfGraph.getAllQuads(nodeURI, RDF.type);
	let ndDef;
	typeQuads.forEach(typeQ => {
		ndDef = nodeDefs.match(typeQ.object.value) || ndDef;
	});
	if (!ndDef) {
		console.error(
			"Error while deleting node, could not find node definitions related to",
			nodeURI
		);
		return;
	}
	removeStructure(ndDef.structure, nodeURI);
}

function removeStructure(structure, parentURI) {
  let node = rdfGraph.getNode(parentURI);
  if (structure.toggle)
    structure.toggle.forEach(subStructure => {
      removeToggle(subStructure, parentURI);
    });
	if (structure.parameters)
		structure.parameters.forEach(subStructure => {
			removeParameter(subStructure, parentURI);
		});
	if (structure.parameterSets)
		structure.parameterSets.forEach(subStructure => {
			removeParameterSet(subStructure, parentURI);
		});
	if (structure.lists)
		structure.lists.forEach(subStructure => {
			removeList(subStructure, parentURI);
		});
  if (node != undefined && node.termType === "BlankNode") rdfGraph.removeAllRelated(parentURI);
}

function removeToggle(structure, parentURI) {
  // TBD
}


function removeParameter(structure, parentURI) {
	let paramQuad = rdfGraph.findQuad(parentURI, structure.mapping);
	if (paramQuad) {
		let param = paramQuad.object;
		if (param.termType === "BlankNode") rdfGraph.removeMatches(param);
	}
}

function removeParameterSet(structure, parentURI) {
	let childURI = structure.mapping
		? rdfGraph.getObjectValue(parentURI, structure.mapping)
		: parentURI;
	removeStructure(structure, childURI);
	rdfGraph.removeAllRelated(childURI);
}

function removeList(structure, parentURI) {
	let objectList = rdfManager.getListObjects(parentURI, structure.mapping);
	let listBlanks = rdfManager.getListBlanks(
		rdfGraph.getObjectValue(parentURI, structure.mapping)
	);
	objectList.forEach(obj => {
		removeStructure(structure, obj);
		if (obj.termType === "BlankNode") rdfGraph.removeMatches(obj);
	});
	listBlanks.forEach(obj => {
		rdfGraph.removeAllRelated(obj);
	});
}
