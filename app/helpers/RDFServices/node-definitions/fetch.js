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
//import Ember from 'ember';
import JsonLdParser from "npm:rdf-parser-jsonld";
import rdf from "npm:rdf-ext";
import SparqlQueries from "ajan-editor/helpers/RDFServices/queries";
import stringToStream from "npm:string-to-stream";
//import {isAjaxError, isNotFoundError, isForbiddenError, isServerError} from 'ember-ajax/errors';

//let $ = Ember.$;
//let ajax = Ember.get('ajax');

export default function(ajax) {
	let repo =
		(localStorage.currentStore || "http://localhost:8090/rdf4j/repositories") +
		"/node_definitions";
	let ajaxPromise = ajax.post(repo, {
		contentType: "application/sparql-query; charset=utf-8",
		headers: {
			Accept: "application/ld+json"
		},
		// SPARQL query
		data: SparqlQueries.constructGraph
	});

	let promisedRdf = ajaxPromise.then(
		function(data) {
			// On accept
			let parser = new JsonLdParser();
			const quadStream = parser.import(stringToStream(JSON.stringify(data)));
			return rdf.dataset().import(quadStream);
		},
		function(jqXHR) {
			// On reject
			console.log("Request failed", jqXHR);
		}
	);
	return promisedRdf;
}
