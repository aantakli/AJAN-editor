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
import freeNodes from "ajan-editor/helpers/graph/free-nodes";
import graphGen from "ajan-editor/helpers/graph/graph-generator";
import graphOperations from "ajan-editor/helpers/graph/graph-operations";
import graphUtil from "ajan-editor/helpers/graph/utility";
import nodeDefs from "./node-defs";
import rdfManager from "ajan-editor/helpers/RDFServices/RDF-manager";
import util from "ajan-editor/helpers/RDFServices/utility";

let $ = Ember.$;
let $template;
let categories = new Array();

export {insertNodeDef};
export default function(cy) {
	// Clear previous content
	$("#Composite").empty();
	$("#Decorator").empty();
	$("#Leaf").empty();
	$("#BehaviorTree").empty();

	// Blur selected nodes when interacting with Graph Manipulation
	$("#node-adder").on("mousedown", () => {
		graphOperations.blur();
	});

  $template = $("#Leaf-Nodes .Leaf-Nodes-Single-Category").clone();
	// Insert the nodes
	insertNodeDefs();

	// Apply the proper style to the nodes
	let style = cy.style().json();
	style = style.concat(nodeDefs.getStyle());
	cy.style(style).update();
	bindDropEvent(cy);
}

function insertNodeDefs() {
	nodeDefs.forEach(node => {
		// Special case for root
		if (node.id === "Tree" || node.id === "BehaviorTree") return;

		insertNodeDef(node);
	});
}

function insertNodeDef(node, btData /*Optional param for behavior trees*/) {
	let $parent = $("#" + node.class);
  if (node.class == "Leaf" && node.category) {
    let category = node.category.replaceAll(' ', '').replaceAll(/[&\/\\#,+()$~%.'":*?<>{}]/g, "");
    $parent = createCategoryDropdown($parent, node, category);
  }
  let evenChild = $parent.children("div").length % 2;
  let $image;
  if (node.style.icon)
    $image = $('<image src="' + (node.style.icon || "") + '" alt="" class="node-icon">');
  else {
    let color = '#000';
    if (node.style.style.label)
      color = node.style.style.color;
    $image = $('<span alt="" style="color:' + color + ';" class="node-icon label-icon">' + node.style.style.label + '</span>');
  }

	let $icon = $('<div class="flex-item node-icon-container"></div>').append($image);
	let $div = $("<div>", {
		id: btData ? btData.name : node.id,
		class: "node-draggable flex-container " + (evenChild ? "even" : "odd")
	})
		.append($icon)
		.append(
			$('<div class="flex-item node-name"></div>').text(
				btData ? btData.name : node.title
			)
		);
	$parent.append($div);

	bindDragEvent($div, node, btData);
}

function createCategoryDropdown($parent, node, category) {
  let $leafNodes = $("#Leaf-Nodes");
  if (!categories.includes(category) || $leafNodes.find("#" + category).length == 0) {
    let $dropdown = $template.clone();
    $dropdown.find(".Leaf-Nodes-Single-Category-Title").text(node.category);
    $dropdown.find(".active.title").removeClass("active");
    let $new = $dropdown.find("#Leaf");
    $new.attr("id", category).removeClass("active");
    addOnClickEvent($dropdown, category);
    $leafNodes.append($dropdown);
    categories.push(category);
    return $new;
  } else {
    return $leafNodes.find("#" + category);
  }
  return $parent;
}

function addOnClickEvent($dropdown, category) {
  $dropdown.click(function () {
    $dropdown.find(".title").toggleClass("active");
    $dropdown.find("#" + category).toggleClass("active");
  });
}

function bindDragEvent($div, node, btData) {
	$div.attr("draggable", "true");
	$div.off("dragstart").on("dragstart", function(e) {
		e.originalEvent.dataTransfer.effectAllowed = "move";
		e.originalEvent.dataTransfer.setData(
			"class",
			btData ? btData.class : node.class
		);
		e.originalEvent.dataTransfer.setData(
			"type",
			btData ? btData.name : node.id
    );
    if (btData) {
      e.originalEvent.dataTransfer.setData("uri", btData.uri);
    }
		console.log("dragstart:", e.originalEvent.dataTransfer.getData("type"));
	});
}

function bindDropEvent(cy) {

	$("#cy")
		.off("dragover")
		.on("dragover", function(e) {
			e.preventDefault();
		});

	$("#cy")
		.off("drop")
		.on("drop", function(e) {
			//e.preventDefault();
			let dropType = e.originalEvent.dataTransfer.getData("type");
			let dropClass = e.originalEvent.dataTransfer.getData("class");
			console.log("dropping:", dropType);

			let label, uri;

			// Special case for Behavior Tree node
			if (dropClass === "BehaviorTree") {
				label = dropType;
        uri = e.originalEvent.dataTransfer.getData("uri");
				rdfManager.generateNode(dropClass, uri, label);
				dropType = dropClass;
				dropClass = "Leaf";
			} else {
				let nodeData = rdfManager.generateNodeData(dropType);
				label = nodeData.label;
        uri = nodeData.uri;
			}

			//TODO: select node and show properties

			let id = util.generateUUID();
			let pos = {
				x: event.offsetX,
				y: event.offsetY
			};
			let newNode = graphGen.node(id, label, uri, dropClass, dropType, pos);
      console.log(newNode, "> with position " + pos.x + ", " + pos.y);
      let newNode_ = cy.add(newNode);
      graphUtil.validateNode(newNode_);
			graphUtil.setNodeDimensions(newNode_);
      freeNodes.push(cy.getElementById(newNode.data.id));
		});
}
