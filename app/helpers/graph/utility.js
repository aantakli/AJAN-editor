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
import Ember from "ember";
import globals from "ajan-editor/helpers/global-parameters";
import nodeDefs from "ajan-editor/helpers/RDFServices/node-definitions/node-defs";
import { ND, RDF, BT, AGENTS } from "ajan-editor/helpers/RDFServices/vocabulary";
import rdfGraph from "ajan-editor/helpers/RDFServices/RDF-graph";

let $ = Ember.$;

let SparqlParser = require('sparqljs').Parser;
let parser = new SparqlParser({ skipValidation: true });

let labelToNodeHeightFactor = 2;
let paddingScaleUnitHeight = 1.5;
let paddingScaleUnitWidth = 2;
let unitDim;
let nodeHeight;
let sizeMult = 1; // increase the scale to increase accuracy w.r.t. zoomed text

export default {
	computeLabelDimensions,
	getNodeHeight,
	// getUnitDimensions,
	setEachNodeParameters,
	setNodeDimensions,
	printNodes,
  printEdges,
  getNode,
  validateNode,
  checkDouplePrefixes,
  updateErrorsList,
  validateEventGoalActionField,
  errorText
};

function computeLabelDimensions(ele, text = "o") {
	// If no ele is given, get dimensions from dummy
	ele = ele || getDummyNode();

	let div = getEmptyDiv();
	let divStyle = div.style;
	setDivStyle(divStyle, ele);
	div.textContent = text;
	let divDimensions = getDivDimensions(div);
	$(div).remove();
	return divDimensions;
}

function getDummyNode() {
	return globals.cy
		.add({
			/*Empty node*/
		})
		.remove();
}

function getEmptyDiv() {
	let div = document.createElement("div");
	document.body.appendChild(div);
	return div;
}

function setDivStyle(divStyle, ele) {
	setDivStyleFromEle(divStyle, ele);
	setForcedDivStyle(divStyle);
	setDivWhitespace(divStyle, ele);
}

function setDivStyleFromEle(divStyle, ele) {
	divStyle.fontFamily = ele.pstyle("font-family").strValue;
	divStyle.fontStyle = ele.pstyle("font-style").strValue;
	divStyle.fontSize = sizeMult * ele.pstyle("font-size").pfValue + "px";
	divStyle.fontWeight = ele.pstyle("font-weight").strValue;
}

function setForcedDivStyle(divStyle) {
	divStyle.position = "absolute";
	divStyle.left = "-9999px";
	divStyle.top = "-9999px";
	divStyle.zIndex = "-1";
	divStyle.visibility = "hidden";
	divStyle.pointerEvents = "none";
	divStyle.padding = "0";
	divStyle.lineHeight = "1";
}

function setDivWhitespace(divStyle, ele) {
	if (ele.pstyle("text-wrap").value === "wrap") {
		divStyle.whiteSpace = "pre"; // so newlines are taken into account
	} else {
		divStyle.whiteSpace = "normal";
	}
}

function getDivDimensions(div) {
	let width = Math.ceil(div.clientWidth / sizeMult);
	let height = Math.ceil(div.clientHeight / sizeMult);
	return {width, height};
}

function getNodeHeight() {
	nodeHeight = nodeHeight || labelToNodeHeightFactor * getUnitHeight();
	return nodeHeight;
}

function getUnitDimensions() {
	unitDim = unitDim || computeLabelDimensions();
	return unitDim;
}

function getUnitHeight() {
	return getUnitDimensions().height;
}

function getUnitWidth() {
	return getUnitDimensions().width;
}

function setEachNodeParameters(cy) {
  cy.nodes().forEach(function (node) {
    setNodeDimensions(node);
    validateNode(node);
  });
}

function setNodeDimensions(node) {
	if (breakNodeWidthFunction(node)) return;

	let labelWidth = computeLabelDimensions(node, node.data("label")).width;
	// Adjust padding according to whether the node has an icon or not
	let padding = node.data("icon") ? getIconPadding() : getUnitWidth();
	node.style("width", labelWidth + padding + "px");
	node.style("height", getNodeHeight() + "px");
}

function getIconPadding() {
	return (
		paddingScaleUnitHeight * getUnitHeight() +
		paddingScaleUnitWidth * getUnitWidth()
	);
}

function breakNodeWidthFunction(node) {
	// Do not resize nodes with fixed labels
	let typeDef = nodeDefs.getTypeDef(node.data("type"));
	return (typeDef) ? typeDef.fixedLabel : undefined;
}


// Helpers; for debugging
function printNodes(cy, eles) {
	let labels = [];
	eles.forEach(ele => {
		if (ele.isNode()) {
			labels.push(ele._private.data.label);
		}
	});
	console.warn(labels);
}

function printEdges(cy, eles) {
	let labels = [];
	eles.forEach(ele => {
		if (ele.isEdge()) {
			let src = cy.$id(ele._private.data.source)._private.data.label;
			let trg = cy.$id(ele._private.data.target)._private.data.label;
			labels.push(src + "___" + trg);
		}
	});
	console.warn(labels);
}

function getNode(comp) {
  let parent = comp.parentView;
  if (parent && parent.node) {
    return parent.node;
  } else if (!parent.parentView) {
    return null;
  } else {
    return getNode(parent);
  }
}

function validateNode(cyNode) {
  let nodeDef = nodeDefs.getTypeDef(cyNode[0]._private.data.type);
  let errors = new Array();
  checkParameters(errors, nodeDef.structure, cyNode[0]._private.data.uri);
  let results = errors.filter(item => item.error == true);
  errorText(cyNode, results.length > 0);
}

function checkParameters(errors, root, uri, collection) {
  if (root.parameters.length > 0) {
    validateParametersError(errors, root.parameters, uri, collection);
  }
  if (root.parameterSets.length > 0) {
    root.parameterSets.forEach(function (parameters) {
      let prametersUri = rdfGraph.getObjectValue(uri, parameters.mapping);
      checkParameters(errors, parameters, prametersUri, ND.ParameterSet);
    });
  }
  if (root.lists && root.lists.length > 0) {
    root.lists.forEach(function (list) {
      let listUri = rdfGraph.getObjectValue(uri, list.mapping);
      checkParameters(errors, list, listUri, ND.List);
    });
  }
}

function validateParametersError(errors, parameters, uri, collection) {
  parameters.forEach(function (parameter) {
    if (collection == ND.List) {
      validateListParameter(errors, parameter, uri);
    } else {
      if (parameter.input == ND.Query) {
        let newUri = rdfGraph.getObjectValue(uri, parameter.mapping);
        validateNodeQuery(errors, parameter, newUri);
      } else if (parameter.input == ND.EventGoal) {
        validateNodeEventGoalAction(errors, parameter, uri, AGENTS.event);
      } else if (parameter.input == ND.Event) {
        validateNodeEventGoalAction(errors, parameter, uri, AGENTS.event);
      } else if (parameter.input == ND.Goal) {
        validateNodeEventGoalAction(errors, parameter, uri, AGENTS.goal);
      } else if (parameter.input == ND.ACTNDef) {
        validateNodeEventGoalAction(errors, parameter, uri, BT.definition);
      }
    }
  });
}

function validateListParameter(errors, parameter, uri) {
  let parameterUri = uri;
  let newUri = uri;
  if (parameter.input == ND.Query) {
    parameterUri = rdfGraph.getObjectValue(newUri, RDF.first);
    validateNodeQuery(errors, parameter, parameterUri);
    newUri = rdfGraph.getObjectValue(newUri, RDF.rest);
    if (newUri && newUri != RDF.nil) {
      validateListParameter(errors, parameter, newUri)
    }
  }
}

function validateNodeQuery(errors, parameter, uri) {
  let result = { uri: uri, error: false, query: "" };
  let query = rdfGraph.getObjectValue(uri, BT.sparql);
  if (uri && query) {
    result.query = query;
    validateQuery(result, query, parameter.types, parameter.optional);
  } else if (parameter.default) {
    validateQuery(result, parameter.default, parameter.types, parameter.optional);
  } else {
    result.error = !parameter.optional ;
  }
  errors.push(result);
}

function validateQuery(result, value, types, optional) {
  try {
    if (optional && value == "") result.error = false;
    if (checkDouplePrefixes(value)) result.error = true;
    let result = parser.parse(value);
    if (types.includes(BT.AskQuery)) {
      result.error = !(result.queryType, "ASK");
    } else if (types.includes(BT.SelectQuery)) {
      result.error = !(result.queryType, "SELECT");
    } else if (types.includes(BT.ConstructQuery)) {
      result.error = !(result.queryType, "CONSTRUCT");
    } else if (types.includes(BT.UpdateQuery)) {
      result.error = !(result.type.toUpperCase(), "UPDATE");
    }
  } catch (error) {
    result.error = true;
  }
}

function checkDouplePrefixes(value) {
  let double = false;
  let prefixes = new Array();
  let rows = value.toLowerCase().split("prefix");
  if (rows.length > 0) {
    rows.forEach(function (row) {
      row = "PREFIX " + row;
      let prefix = row.match(new RegExp("PREFIX (.*?):"));
      if (prefix) {
        prefix = prefix[0].replace(" ", "");
        if (!double && prefixes.includes(prefix)) {
          double = true;
        } else {
          prefixes.push(prefix);
        }
      }
    });
  }
  return double;
}

function validateNodeEventGoalAction(errors, parameter, uri, predicate) {
  let result = { uri: uri, error: false, event: "" };
  let event = rdfGraph.getObjectValue(uri, predicate);
  if (uri && event && event != "undefined") {
    result.event = event;
    result.error = false;
  } else if (parameter.default) {
    result.error = false;
  } else {
    result.error = !parameter.optional;
  }
  errors.push(result);
}

function validateEventGoalActionField(comp, error) {
  if (!comp.get("optional")
    && !comp.get("selected")
    && (!comp.get("value")
      || comp.get("value") == 'undefined')) {
    comp.set("validation", error);
    updateErrorsList(comp, true);
  } else {
    updateErrorsList(comp, false);
    comp.set("validation", undefined);
  }
}

function updateErrorsList(comp, error) {
  let errors = getNode(comp).errors;
  if (!error && errors) {
    errors = errors.filter(item => item != comp.elementId);
    if (errors && errors.length == 0) {
      errorText(getNode(comp).node, false);
    }
    getNode(comp).errors = errors;
  } else {
    if (errors && !errors.includes(comp.elementId)) {
      getNode(comp).errors.push(comp.elementId);
      errorText(getNode(comp).node, true);
    }
  }
}

function errorText(node, error) {
  let nodeDef = nodeDefs.getTypeDef(node[0]._private.data.type);
  if (error) {
    node.style("background-image", "/icons/error.png");
    node.style("color", "#F00");
  } else {
    if (nodeDef.style.icon) {
      node.style("background-image", nodeDef.style.icon);
    } else {
      node.style("background-image", "");
    }
    node.style("color", "#000");
  }
}

function nodeDefault(node) {
  node.style("border-color", "#000");
}

function nodeSuccsess(node) {
  node.style("border-color", "#0F0");
}

function nodeFailure(node) {
  node.style("border-color", "#F00");
}

function nodeRunning(node) {
  node.style("border-color", "#00F");
}
