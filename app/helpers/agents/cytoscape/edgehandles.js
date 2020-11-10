/*
 * Created on Tue Nov 10 2020
 *
 * The MIT License (MIT)
 * Copyright (c) 2020 André Antakli, Xueting Li (German Research Center for Artificial Intelligence, DFKI).
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
export default function(/*cy*/) {
	return {
		preview: true, // whether to show added edges preview before releasing selection
		hoverDelay: 50, // time spent hovering over a target node before it is considered selected
		handleNodes: "node.custom-handle", // selector/filter function for whether edges can be made from a given node
		handlePosition: function handlePosition(/*node*/) {
			return "middle middle"; // sets the position of the handle in the format of "X-AXIS Y-AXIS" such as "left top", "middle top"
		},
		handleInDrawMode: false, // whether to show the handle in draw mode
		edgeType: function(sourceNode, targetNode) {
			// can return 'flat' for flat edges between nodes or 'node' for intermediate node between them
			// returning null/undefined means an edge can't be added between the two nodes

			// If source is the root and target is a leaf
			if (
				(sourceNode.hasClass("ch-endpoint-right") &&
					targetNode.hasClass("ch-event-left")) ||
				(sourceNode.hasClass("ch-event-left") &&
					targetNode.hasClass("ch-endpoint-right")) ||
				(sourceNode.hasClass("ch-behavior-left") &&
					targetNode.hasClass("ch-event-right")) ||
				(sourceNode.hasClass("ch-event-right") &&
					targetNode.hasClass("ch-behavior-left"))
			)
				return "flat";

			// Default
			return null;
		},
		loopAllowed: function(/*node*/) {
			// for the specified node, return whether edges from itself to itself are allowed
			return false;
		},
		nodeLoopOffset: -50, // offset for edgeType: 'node' loops
		nodeParams: function(/*sourceNode, targetNode*/) {
			// for edges between the specified source and target
			// return element object to be passed to cy.add() for intermediary node
			return {};
		},
		edgeParams: function(sourceNode, targetNode /*, i*/) {
			// for edges between the specified source and target
			// return element object to be passed to cy.add() for edge
			// NB: i indicates edge index in case of edgeType: 'node'

			// Flip edges to follow the left to right flow
			if (
				(sourceNode.hasClass("ch-behavior-left") &&
					targetNode.hasClass("ch-event-right")) ||
				(sourceNode.hasClass("ch-event-left") &&
					targetNode.hasClass("ch-endpoint-right"))
			)
				return {
					data: {
						source: targetNode.id(),
						target: sourceNode.id()
					}
				};

			// Default
			return {};
		},
		start: function(/*sourceNode*/) {
			// fired when edgehandles interaction starts (drag on handle)
			//TODO: select source node?
			//$(':selected').removeAttr('selected');
			//sourceNode.select();
		},
		complete: function(/*sourceNode, targetNodes/*, addedEntities*/) {
			// fired when edgehandles is done and entities are added
			/*
			//TODO: Adjust for multiple targetNodes?
			// Special cases, preventing the deletion of edges when none can be created anyhow
			// If target is the root
			if (targetNodes[0].scratch('class') === 'Root') return;
			// If source is a leaf
			if (sourceNode.scratch('class') === 'Leaf') return;
			// If source is the root and target is a leaf
			if (sourceNode.scratch('class') === 'Root' &&
				targetNodes[0].scratch('class') === 'Leaf')
				return;

			//TODO: TargetNode_S_ -> can there be several? currently assume one

			//TODO: also update edge id? else we might risk overlaps

			//TODO: test this
			// Remove other incoming edges of the target node
			targetNodes.forEach((node) => {
				let edges = node._private.edges
				let trashBin = []
				edges.forEach((edge) => {
					let sourceURI = cy.$("#" + edge.data('source')).scratch('uri');
					let targetURI = cy.$("#" + edge.data('target')).scratch('uri');
					//console.log('deleting the edge from', sourceURI, 'to', targetURI);
					if (sourceURI !== node.scratch('uri')) {
						//TODO: BUG?
						rdfManager.removeChild(sourceURI, targetURI);
					}
					if (edge.data('source') !== node.id() && edge.data('source') !== sourceNode.id())
						trashBin.push(edge);
				});
				trashBin.forEach(function(edge) {
					edge.remove();
				});
				// Remove targetNodes from the free nodes
				freeNodes.remove(node);
			});

			// Root and Decorators have only one outgoing edge
			if (sourceNode.scratch('class') === 'Root' ||
				sourceNode.scratch('class') === 'Decorator') {
					let edges = sourceNode._private.edges;
					let deleteEdges = [];
					edges.forEach((edge) => {
						if (edge.data('source') === sourceNode.id() && edge.data('target') !== targetNodes[0].id()){
							deleteEdges.push(edge);
							let sourceURI = cy.$("#" + edge.data('source')).scratch('uri');
							let targetURI = cy.$("#" + edge.data('target')).scratch('uri');
							rdfManager.removeChild(sourceURI, targetURI);
						}
					})
					while (deleteEdges.length > 0){
						let edge = deleteEdges.pop();
						edge.remove();
					}
			}



			// Source node is the parent
			let sourceURI = sourceNode.scratch('uri');
			let targetURI = targetNodes.scratch('uri');
			//TODO: BUG
			rdfManager.insertChild(sourceURI, targetURI);
			// Go through the list of children and find the last (blank) nodes
			// Append the target node
			//TODO: Sort list of children
			cy.emit('free', targetNodes[0]);
			// Update the edge style
			addedEntities.forEach(function(edge) {
				graphOperations.updateEdge(edge);
			});*/
		},
		stop: function(/*sourceNode*/) {
			// fired when edgehandles interaction is stopped (either complete with added edges or incomplete)
		},
		cancel: function(/*sourceNode, renderedPosition, invalidTarget*/) {
			// fired when edgehandles are cancelled ( incomplete - nothing has been added ) - renderedPosition is where the edgehandle was released, invalidTarget is
			// a collection on which the handle was released, but which for other reasons (loopAllowed | edgeType) is an invalid target
		},
		hoverover: function(/*targetNode*/) {
			// fired when a target is hovered
			//targetNode.addClass('active');
		},
		hoverout: function(/*targetNode*/) {
			// fired when a target isn't hovered anymore
		},
		previewon: function(/*sourceNode, targetNode, previewEles*/) {
			// fired when preview is shown
		},
		previewoff: function(/*sourceNode, targetNode, previewEles*/) {
			// fired when preview is hidden
		},
		drawon: function() {
			// fired when draw mode enabled
		},
		drawoff: function() {
			// fired when draw mode disabled
		}
	};
}
