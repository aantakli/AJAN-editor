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
import {computed} from "@ember/object";
import Service from "@ember/service";

export default Service.extend({
	ajax: Ember.inject.service(),
	baseUrl: computed(function() {
		let url = localStorage.currentStore || "http://localhost:8090/rdf4j/repositories/"
		return (url.endsWith("/")) ? url : url + "/";
	}),

	repository: "",
	url: computed("baseUrl", "repository", function() {
		return this.get("baseUrl") + this.get("repository");
		// return this.get("baseUrl") + this.get("repository") + "/statements"
	}),

	queryTS: function(query, callback) {
		let ajaxPromise = this.get("ajax").post(this.url, {
			contentType: "application/sparql-query; charset=utf-8",
			headers: {
				Accept: "application/ld+json"
			},
			data: query
		});

		let promisedRdf = ajaxPromise.then(
			function(data) {
				// On accept
				return callback(data);
			},
			function(jqXHR) {
				// On reject
				console.log("Request failed", jqXHR);
			}
		);
		return promisedRdf;
	},

	updateTS: function(query, callback) {
		let dataString = $.param({update: query});
		console.log("dataString", dataString);
		let ajaxPromise = this.get("ajax").post(this.url + "/statements", {
			contentType: "application/x-www-form-urlencoded; charset=utf-8",
			// contentType: "application/sparql-update; charset=utf-8",
			// contentType: "application/sparql-query; charset=utf-8",
			headers: {
				Accept: "application/ld+json"
			},
			data: dataString
			// data: query
		});

		let promisedRdf = ajaxPromise.then(
			function(data) {
				// On accept
				callback(data);
			},
			function(jqXHR) {
				// On reject
				console.log("Request failed", jqXHR);
			}
		);
		return promisedRdf;
	}
});
