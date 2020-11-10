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
import DS from "ember-data";

export default DS.Serializer.extend({
	//export default DS.JSONSerializer.extend({
	// Mandatory overrides

	/**
	 * Normalizes a payload from the server to a JSON-API Document.
	 *
	 * store: DS.Store
	 * primaryModelClass: DS.Model
	 * payload: Object
	 * id: String|Number
	 * requestType: String
	 *
	 * returns: Object: JSON-API Document
	 **/
	normalizeResponse(store, primaryModelClass, payload, id, requestType) {
		console.log("normalizeResponse");
		console.log("store", store);
		console.log("primaryModelClass", primaryModelClass);
		console.log("payload", payload);
		console.log("id", id);
		console.log("requestType", requestType);

		return this._super(store, primaryModelClass, payload, id, requestType);
	},

	/**
	 * When a record is saved, converts the record into the form that the server expects.
	 *
	 * snapshot: DS.snapshot
	 * options: Object
	 *
	 * returns: Object
	 **/
	serialize(snapshot, options) {
		console.log("serialize");
		return this._super(snapshot, options);
	},

	// Optional override
	/**
	 * Converts a payload received from the server into the normalized form store.push() expects.
	 *
	 * typeClass: DS.Model
	 * hash: Object
	 *
	 * returns: Object
	 **/
	normalize(modelClass, resourceHash) {
		console.log("normalize");
		return this._super(modelClass, resourceHash);
	}
});
