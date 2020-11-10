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
import ajaxActions from "ajan-editor/helpers/behaviors/actions/ajax";
import freeNodes from "ajan-editor/helpers/graph/free-nodes";
import modalActions from "ajan-editor/helpers/behaviors/actions/modal";
import graphActions from "ajan-editor/helpers/behaviors/actions/graph";
import rdfManager from "ajan-editor/helpers/RDFServices/RDF-manager";

export default {
	// AJAX related Actions
	getFromServer: ajaxActions.getFromServer,
	getBehaviorTrees: ajaxActions.getBehaviorTrees,
	saveGraph,
	restoreSaved: ajaxActions.restoreSaved,

	// Graph Actions
	// setDefaultBT: graphActions.setDefaultBT,
	addNewBT: graphActions.addNewBT,

	// Modal actions
	openModal: modalActions.openModal,
	closeJSON: modalActions.closeJSON,
	closeHelp: modalActions.closeHelp,
	cancelJson: modalActions.cancelJson,
	saveJson: modalActions.saveJson,
  addBT: modalActions.addBT,
  //deleteBT: modalActions.deleteBT
};

function saveGraph(ajax, tripleStoreRepository, cy) {
	let freebies = freeNodes.get();
	console.log("Free nodes: ", freebies);
	if (freebies.length > 0) {
		// Free nodes, ask for confirmation to delete them
		let message =
			"There are disconnected nodes which will be deleted upon saving:";
		freebies.forEach(nd => {
			message += "\n" + nd.data("label");
		});
		if (confirm(message)) {
			freebies.forEach(nd => {
				rdfManager.deleteNode(nd, 0);
				cy.remove(cy.getElementById(nd.id()));
			});
			freeNodes.reset();
			ajaxActions.saveGraph(ajax, tripleStoreRepository);
		}
	} else {
		// No free nodes, just save it
		ajaxActions.saveGraph(ajax, tripleStoreRepository);
	}
}
