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
import {computed, observer} from "@ember/object";
import {
  sendAskQuery,
  sendSelectQuery,
	sendQuery
} from "ajan-editor/helpers/RDFServices/ajax/query-rdf4j";
import Component from "@ember/component";
import { graphDatasetBeautify, csvDatasetBeautify } from "ajan-editor/helpers/RDFServices/RDF-utility/dataset-format";
import Sparql from "npm:sparqljs";
import stringToStream from "npm:string-to-stream";
import rdf from "npm:rdf-ext";
import N3Parser from "npm:rdf-parser-n3";

let defaultRepositoryString = "defaultRepository";
let currentRepositoryString = "defaultRepository";
let ajax = null; // ajax

export default Component.extend({
  ajax: Ember.inject.service(),
	vocabularyManager: Ember.inject.service("data-manager/vocabulary-manager"),
  defaultRepository: computed("defaultRepository", function () {
    return localStorage.currentStore + "agents";
  }),
  showQueryResults: true,
  prefixes: [],
  currentRepository: computed("defaultRepository", function () {
		return this.get(defaultRepositoryString);
	}),
	modeChanged: observer("mode", function() {
		handleQuery("", this);
	}),

	didInsertElement() {
		let dataPromise = this.vocabularyManager.getAllDataPromise();
    let that = this;

    ajax = that.get("ajax");

		dataPromise.then(data => {
			data = data.map(ele => {
				return {
					label: ele.prefix,
					iri: ele.uri
				};
			});
      that.set("prefixes", data);
      that.set("parentView.prefixes", data);
      
			this.send("repoSelected", this.get(defaultRepositoryString));
			let editor = ace.edit("ace-editor");
			editor.getSession().on("change", function(changes, session) {
				editorContentUpdate(changes, session, that);
			});
		});
	},

	actions: {
    repoSelected(repo) {
      this.set(currentRepositoryString, repo);
      this.set("parentView.currentRepository", this.get(currentRepositoryString));
      console.log(this.parentView.currentRepository);
			let query = getWhereGraphQuery(
				ace
					.edit("ace-editor")
					.getValue()
					.toString()
			);
			handleQuery(query, this);
		}
	}
});

function editorContentUpdate(changes, session, that) {
	// TODO: handle delete update (e.g. when replacing a string)
	let query = session.getValue().toString();
	// query = getWhereGraphQuery(query);
	handleQuery(query, that);
}

function handleQuery(query, that) {
	that.set("malformedQuery", false);
	try {
		let query = ace
			.edit("ace-editor")
			.getValue()
			.toString();
		switch (that.get("mode")) {
			case "all":
				query = getAllQuery();
        setGraphDataRDF(query, that);
				break;
			case "where":
				query = getWhereGraphQuery(query);
        setGraphDataRDF(query, that);
				break;
			case "query":
				resolveQuery(query, that);
				break;
			case "none":
			default:
				that.set("tableData", undefined);
				return;
		}
		// let promise = sendQuery(that.get(currentRepositoryString), query);
		// promise.then(data => {
		// 	let dataset = datasetBeautify(data);
		// 	that.set("tableData", dataset);
		// });
	} catch (e) {
		console.warn("Could not handle query", query, e);
		that.set("malformedQuery", true);
		that.set("tableData", undefined);
	}
}

function getAllQuery() {
	return "CONSTRUCT WHERE {?s ?p ?o}";
}

function getWhereGraphQuery(query) {
	let prefixes = getPrefixes(query);
	let base = getBasicForm();
	let whereClause = getWhereClause(query);

	if (!whereClause) return;
	let newQuery = prefixes + base + whereClause;
	return newQuery;
}

function getPrefixes(query) {
	let index = query.toUpperCase().indexOf("ASK");
	if (index < 0) index = query.toUpperCase().indexOf("CONSTRUCT");
	if (index < 0) index = query.toUpperCase().indexOf("DESCRIBE");
	if (index < 0) index = query.toUpperCase().indexOf("SELECT");
	if (index < 0) index = query.toUpperCase().indexOf("DELETE");
	if (index < 0) index = query.toUpperCase().indexOf("INSERT");

	return index > -1 ? query.slice(0, index) : "";
}

function getBasicForm() {
	return `
CONSTRUCT `;
}

function getWhereClause(query) {
	// let index = query.toUpperCase().indexOf("WHERE");
	let index = query.toUpperCase().indexOf("WHERE");
	return index > -1 ? query.slice(index) : undefined;
}

function resolveQuery(query, that) {
	console.log("resolveQuery", ...arguments)
	let parser = new Sparql.Parser();
	let parsedQuery = parser.parse(query);
	console.log("Resolving query of type", parsedQuery)
	switch (parsedQuery.queryType) {
		case "DESCRIBE":
		case "CONSTRUCT":
      setGraphDataRDF(query, that);
			break;
		case "ASK":
			setDataBool(query, that);
			break;
    case "SELECT":
      setTableData(query, that);
			break;
		default:
			console.warn("Could not read query type ", parsedQuery.queryType);
	}
}

function setGraphDataRDF(query, that) {
  that.set("dataFormat", "RDF");
	let promise = sendQuery(ajax, that.get(currentRepositoryString), query, "application/trig");
  promise.then(data => {
    that.set("data", data);
    const parser = new N3Parser();
    const quadStream = parser.import(stringToStream(data));
    let dataset = rdf.dataset().import(quadStream);
    let beautiful = graphDatasetBeautify(dataset, that.prefixes);
    beautiful.then(dataTable => { that.set("tableData", dataTable) });
	});
}

function setTableData(query, that) {
  that.set("dataFormat", "TABLE");
  let promise = sendSelectQuery(ajax, that.get(currentRepositoryString), query);
  promise.then(data => {
    var lines = data.split('\r');
    for (let i = 0; i < lines.length; i++) {
      lines[i] = lines[i].replace(/\s/, '')
    }
    var csv = [];
    var headers = lines[0].split(",");
    for (var i = 1; i < lines.length; i++) {
      var obj = {};
      var currentline = lines[i].split(",");
      for (var j = 0; j < headers.length; j++) {
        obj[headers[j].toString()] = currentline[j];
      }
      csv.push(obj);
    }
    let dataset = csvDatasetBeautify(csv, that.prefixes);
    that.set("tableData", dataset);
  });
}

function setDataBool(query, that) {
	that.set("dataFormat", "BOOL");
	let promise = sendAskQuery(ajax, that.get(currentRepositoryString), query);
	promise.then(data => {
		that.set("tableData", undefined);
		data = !(!data || data == "false");
		that.set("data", data);
	});
}
