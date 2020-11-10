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
import Service from "@ember/service";
import SparqlQueries from "ajan-editor/helpers/RDFServices/queries";

export default Service.extend({
	editorDataService: Ember.inject.service("triplestore/editor-data"),
	dataType: "",
	data: undefined,
	dataClass: undefined,

	init(dataType, dataClass) {
		this.set("dataType", dataType);
		this.set("dataClass", dataClass);
		if (!this.get("dataClass").create)
			throw Error('No "create" function defined for ' + dataType);
		let query = SparqlQueries.createNamedGraph(this.dataType);
		this.editorDataService.updateTS(query, function() {});
	},

	getAllDataPromise() {
		if (this.data) return this.data;
		let that = this;
		let query = SparqlQueries.constructNamedGraph(this.dataType);
		return this.editorDataService.queryTS(query, function(data) {
			return data.map(element => {
				let dataClass = that.get("dataClass").create();
				dataClass.fromJSONld(element);
				return dataClass;
			});
		});
	},

	getData(id) {
		console.warn("Getting element by id not yet implemented. ", id);
	},

	save(object) {
		if (!object.toTriples || !object.id)
			throw Error("object not properly defined");
		let triples = object.toTriples();
		return this.setData(object.id, triples);
	},

	setData(id, string) {
		// TODO:
		// id exisits: update
		// id is new: create
		let query = SparqlQueries.insertInGraph(this.dataType, string);
		return this.editorDataService.updateTS(query, function() {});
	},

	replace(oldUri, object) {
		if (!object.toTriples || !object.id)
			throw Error("object not properly defined");
		let triples = object.toTriples();
		return this.replaceData(oldUri, triples);
	},

	replaceData(oldUri, insertTriples) {
		let deleteTriple = `<${oldUri}> ?xclrGui ?yqpkbfqut`;
		let query = SparqlQueries.deleteInsertInGraph(
			this.dataType,
			deleteTriple,
			insertTriples
		);
		this.editorDataService.updateTS(query, function() {});
	},

	remove(object) {
		if (!object.get("storageUri")) throw Error("object not properly defined");
		this.removeData(object.get("storageUri"));
	},

	removeData(uri) {
		let deleteTriple = `<${uri}> ?p ?o`;
		let query = SparqlQueries.deleteInGraph(this.dataType, deleteTriple);
		this.editorDataService.updateTS(query, function() {});
	},

	persistData() {},

	fetchAllData() {},

	persistAllData() {}
});
