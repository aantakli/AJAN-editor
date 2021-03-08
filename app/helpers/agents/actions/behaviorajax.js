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

import behaviorsHlp from "ajan-editor/helpers/RDFServices/behaviorsRDFConsumer";//!
import Ember from "ember";
import {
	/*isAjaxError, isNotFoundError, isForbiddenError,*/ isServerError
} from "ember-ajax/errors";
import rdfGraph from "ajan-editor/helpers/RDFServices/RDF-graph";
import SparqlQueries from "ajan-editor/helpers/RDFServices/queries";

let $ = Ember.$;
let behaviors = undefined;

export default {
	getBehaviors: function() {
		return behaviors;
	},

	// Gets entire graph from server
	getFromServer: function(ajax, tripleStoreRepository) {
		let ajaxPromise = ajax.post(tripleStoreRepository,
      {
			contentType: "application/sparql-query; charset=utf-8",
			headers: { Accept: "application/ld+json" },
			// SPARQL query
			data: SparqlQueries.constructGraph
		  }
		  );

		let promisedRdfGraph = ajaxPromise.then(
			function(data) {
				// On accept
				//console.log('Entire graph:', data);
				let behaviorsGraph = behaviorsHlp.getBehaviorsGraph(data);
				let promise = Promise.resolve(behaviorsGraph);
				let promiseValue = promise.then(function(behaviorsResolved) {
					// Parse the behaviors graph
					//console.log('behaviorsResolved', behaviorsResolved)
					behaviors = behaviorsResolved[0];
					let rdfGraph = behaviorsResolved[1];
					return rdfGraph;
				});
				return promiseValue;
			},

			function(jqXHR) {
				// On reject
				console.log("Request failed", jqXHR);
			}
		);
		return promisedRdfGraph;
	},



	saveGraph: function(ajax, tripleStoreRepository) {
		console.log("Saving to triple store: ", tripleStoreRepository);

		let postDestination = tripleStoreRepository + "/statements";
		let rdfString = rdfGraph.toString();
		console.log(rdfString);
		let query = SparqlQueries.update(rdfString);
		let dataString = $.param({update: query});

		// Keep local copy of saved stuff
		localStorage.setItem(
			"rdf_graph_saved_T-2",
			localStorage.getItem("rdf_graph_saved_T-1")
		);
		localStorage.setItem("rdf_graph_saved_T-1", dataString);

		ajax
			.post(postDestination, {
				contentType: "application/x-www-form-urlencoded; charset=utf-8",
				headers: {
					Accept: "application/ld+json"
				},
				// SPARQL query
				data: dataString
			})
			.catch(function(error) {
				if (isServerError(error)) {
					// handle 5XX errors

					let restoreID = "rdf_graph_saved_T-2";
					let restoredItem = localStorage.getItem(restoreID);
					ajax
						.post(postDestination, {
							contentType: "application/x-www-form-urlencoded; charset=utf-8",
							headers: {
								Accept: "application/ld+json"
							},
							// SPARQL query
							data: restoredItem
						})
						.then(
							function(data) {
								// On accept
								console.log("Request success", data);
							},
							function(jqXHR) {
								// On reject
								console.log("Request failed", jqXHR);
							}
						);
					alert("Reloading previous save");
					location.reload();

					return;
				}
				throw error;
			});

		rdfGraph.unsavedChanges = false;
	}
};


