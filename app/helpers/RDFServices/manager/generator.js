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
import {
	BT,
	ND,
	RDF,
	RDFS,
	XSD
} from "ajan-editor/helpers/RDFServices/vocabulary";
import nodeDefs from "ajan-editor/helpers/RDFServices/node-definitions/node-defs";
import rdf from "npm:rdf-ext";
import rdfFact from "ajan-editor/helpers/RDFServices/RDF-factory";
import rdfGraph from "ajan-editor/helpers/RDFServices/RDF-graph";

//Generate RDF data for a new node
export default {
	generateNode,
	generateStructure,
	generateBT
};

function generateBT(uri, label) {
	let resource = rdf.namedNode(uri);
	let quads = [
		rdfFact.quad(resource, RDF.type, BT.BehaviorTree),
		rdfFact.quad(resource, RDF.type, BT.Root),
		rdfFact.quad(resource, BT.hasChild, RDF.nil),
		rdfFact.quadLiteral(resource, RDFS.label, label),
	];
	rdfGraph.addAll(quads);
}

function generateNode(type, uri, label) {
	let nodeDef = nodeDefs.getTypeDef(type);
	if (!nodeDef) return;
	let quadType = rdfFact.quad(uri, RDF.type, nodeDef.type);
	let quadLabel = rdfFact.quadLiteral(quadType.subject, RDFS.label, label);

	let structure = nodeDef.structure;
	let parent = quadType.subject;
	generateStructure(structure, parent);

	//TODO: Store in list and add all at once
	rdfGraph.add(quadType);
	rdfGraph.add(quadLabel);
}

function generateStructure(structure, parent, isListItem = false) {
  if (structure.toggle)
    structure.toggle.forEach(subStructure => {
      generateToggle(subStructure, parent, isListItem);
    });
	if (structure.parameters)
		structure.parameters.forEach(subStructure => {
			generateParameter(subStructure, parent, isListItem);
		});
	if (structure.parameterSets)
		structure.parameterSets.forEach(subStructure => {
			generateParameterSet(subStructure, parent, isListItem);
		});
	if (structure.lists)
		structure.lists.forEach(subStructure => {
			generateList(subStructure, parent, isListItem);
		});
}

function generateToggle(structure, parent, isListItem) {
  rdfGraph.add(rdfFact.quad(parent, ND.toggle, ND.First));
  generateStructure(structure.first, parent, isListItem);
}

function generateParameter(
	structure,
	parent,
	isListItem /*Only for list params*/
) {
	if (structure.input && structure.input !== ND.Query) {
		if (isListItem) {
			rdfGraph.findQuad("", RDF.first, parent.value).object = rdfFact.literal(
				structure.default,
				structure.input
			);
		} else {
			rdfGraph.add(
				rdfFact.quadLiteral(
					parent,
					structure.mapping,
					structure.default,
					structure.input
				)
			);
			attachTypes(parent, structure.types);
		}
	} else if (structure.input === ND.Query) {
		// Special case for creating a query
		let node = parent;
		if (structure.mapping && structure.mapping != RDF.first) {
			let quad = rdfFact.quadBlank(parent, structure.mapping);
			rdfGraph.add(quad);
			node = quad.object;
		}
		// Add quads to graph
    if (structure.default) {
      rdfGraph.add(rdfFact.quadLiteral(node, BT.sparql, structure.default, XSD.string));
    } else {
      rdfGraph.add(rdfFact.quadLiteral(node, BT.sparql, "", XSD.string));
    }
		// Differentiate between target and origin base
		if (!structure.targetBase && !structure.originBase) {
			rdfGraph.add(rdfFact.quad(node, BT.beliefBase, "http://www.ajan.de/ajan-ns#AgentKnowledge"));
		}
		if (structure.originBase) {
			rdfGraph.add(rdfFact.quad(node, BT.originBase, "http://www.ajan.de/ajan-ns#AgentKnowledge"));
		}
		if (structure.targetBase) {
			rdfGraph.add(rdfFact.quad(node, BT.targetBase, "http://www.ajan.de/ajan-ns#AgentKnowledge"));
		}
		attachTypes(node, structure.types);
	} else {
		console.warn("Unknown parameter type: ", structure.input);
	}
}

function generateParameterSet(structure, parent, isListItem) {
	// Mapping undefined: parent is the blank node the substructure will be attached to
  if (!structure.mapping || isListItem) {
		attachTypes(parent, structure.types);
		generateStructure(structure, parent);
		return;
  }

	let quad = rdfFact.quadBlank(parent, structure.mapping);
	rdfGraph.add(quad);
	attachTypes(quad.object, structure.types);
	generateStructure(structure, quad.object);
}

function generateList(structure, parent, isListItem) {
	// Create mapping to list head
	let isDirectParam = false;
	if (structure.parameters && structure.parameters.length > 0) {
		// Handle special cases
		if (structure.parameters.length > 1)
			console.error(
				"Several parameters defined directly in a list. Please move them into a ParameterSet"
			);
		if (structure.parameterSets && structure.parameterSets.length > 0)
			console.error(
				"Parameter(s) and ParameterSet(s) are directly defined in a list. Please merge them into a single ParameterSet"
			);
		if (structure.lists && structure.lists.length > 0)
			console.error(
				"Parameter(s) and List(s) are directly defined in a list. Please merge them into a single ParameterSet"
			);

		// isDirectParam => parameter will be defined as <blanky> rdf:first <parameter>
		isDirectParam = true;
	}

	// Add one default element to the list
	let quad = isListItem
		? rdfFact.quadBlank(parent, RDF.first)
		: rdfFact.quadBlank(parent, structure.mapping);
	let blanky = quad.object;
	let listEle = rdfFact.blankNode();
	rdfGraph.add(rdfFact.quad(blanky, RDF.first, listEle));
	rdfGraph.add(rdfFact.quad(blanky, RDF.rest, RDF.nil));
	rdfGraph.add(quad);
	generateStructure(structure, listEle, isDirectParam);
}

// Helper to attach rdf:type values
function attachTypes(parent, types) {
	if (!parent || !types) return;
	types.forEach(type => {
		rdfGraph.add(rdfFact.quad(parent, RDF.type, type));
	});
}
