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
import {EDITOR, RDFS} from "ajan-editor/helpers/RDFServices/vocabulary";
import EmberObject, {computed} from "@ember/object";
import Ember from "ember";
import StorableObject from "ajan-editor/objects/storable-object";

let Template = StorableObject.extend({
	title: "",
	description: "",
	nodes: Ember.A(),
	targetBase: "http://www.ajan.de/ajan-ns#AgentKnowledge",
	query: "",
	parameters: Ember.A(),
	queryVariables: [],

	id: computed("title", function() {
		return this.get("title");
	}),

	nodesArray: computed("nodes", function() {
		if (!this.nodes) return [];
		if (typeof this.nodes != "object") this.nodes = [this.nodes];
		return this.nodes;
	}),

	getUsedVariables() {
		return this.parameters.map(parameter => parameter.variable);
	},

	getFreeVariables(usedVariables) {
		let usedSet = new Set(usedVariables || this.getUsedVariables());
		let difference = [
			...new Set([...this.queryVariables].filter(x => !usedSet.has(x)))
		];
		return difference;
	},

	toSparql(options = {debug: true}) {
		let query = this.query;
		let unboundVariables = [];
		this.parameters.forEach(param => {
			if (!param.variableBinding) {
				unboundVariables.push("?" + param.label);
				return;
			}
			let variableRegex = new RegExp("[\\?\\$]" + param.variable, "g");
			query = query.replace(variableRegex, param.variableBinding);
		});
		if (options.debug && unboundVariables.length > 0)
			console.warn(`Unbound variable(s):`, unboundVariables.join(", "));
		return query;
	},

	toJSON() {
		return {
			id: this.id,
			title: this.title,
			description: this.description,
			nodes: this.nodes,
			targetBase: this.targetBase,
			query: this.query,
			queryVariables: this.queryVariables,
			parameters: this.parameters.map(parameter => parameter.toJSON())
		};
	},

	fromJSON(json) {
		this.title = json.title;
		this.description = json.description;
		this.nodes = json.nodes;
		this.targetBase = json.targetBase;
		this.query = json.query;
		this.queryVariables = json.queryVariables;
		this.parameters = Ember.A(
			json.parameters.map(parameter => {
				let param = Parameter.create();
				param.fromJSON(parameter);
				return param;
			})
		);
	},

	fromJSONld(data) {
		let parameterString = decodeURI(data[EDITOR.parameters][0]["@value"]);
		let parameters = JSON.parse(parameterString);
		this.title = decodeURI(data[RDFS.label][0]["@value"]);
		this.description = decodeURI(data[RDFS.comment][0]["@value"]);
		this.nodes = decodeURI(data[EDITOR.nodes][0]["@value"]);
		this.targetBase = decodeURI(data[EDITOR.targetBase][0]["@value"]);
		this.query = decodeURI(data[EDITOR.query][0]["@value"]);
		this.queryVariables = decodeURI(data[EDITOR.queryVariables][0]["@value"]);
		this.parameters = Ember.A(
			parameters.map(parameter => {
				let param = Parameter.create();
				param.fromJSON(parameter);
				return param;
			})
		);
	},

	toTriples() {
		let resource = this.get("storageUri");
		let parameters = JSON.stringify(
			this.parameters.map(parameter => parameter.toJSON())
		);
		return (
			this.produceSparqlTriplewithString(resource, EDITOR.id, this.id) +
			this.produceSparqlTriplewithString(resource, RDFS.label, this.title) +
			this.produceSparqlTriplewithString(
				resource,
				RDFS.comment,
				this.description
			) +
			this.produceSparqlTriplewithString(resource, EDITOR.nodes, this.nodes) +
			this.produceSparqlTriplewithString(
				resource,
				EDITOR.targetBase,
				this.targetBase
			) +
			this.produceSparqlTriplewithString(resource, EDITOR.query, this.query) +
			this.produceSparqlTriplewithString(
				resource,
				EDITOR.queryVariables,
				this.queryVariables
			) +
			this.produceSparqlTriplewithString(
				resource,
				EDITOR.parameters,
				parameters
			)
		);
	},

	resetParameterValues() {
		this.parameters.forEach(parameter => parameter.resetValue());
	}
});

let Parameter = EmberObject.extend({
  label: null,
  variable: null,
  variableBinding: null,
  note: null,
  possibleValues: [],
  sparql: {
    repo: "http://localhost:8090/rdf4j/repositories/test_knowledge",
    query: "SELECT ?label ?dataValue ?dataType WHERE { ... }",
  },
	title: computed("label", function() {
		return this.label || "Undefined Label";
	}),
	mode: "Input",
  isDropdown: computed("mode", function () {
    return this.mode === "Dropdown";
  }),
  isSPARQL: computed("mode", function () {
    return this.mode === "SPARQL-Dropdown";
  }),
	isInput: computed("mode", function() {
		return this.mode === "Input";
	}),
	isRadio: computed("mode", function() {
		return this.mode === "Radio Buttons";
	}),

	resetValue() {
		this.set("variableBinding", undefined);
	},

  toJSON() {
    let sparql = {};
    if (this.sparql != undefined) {
      sparql.repo = this.sparql.repo;
      sparql.query = encodeURI(this.sparql.query);
    }
		return {
			label: this.label,
			variable: this.variable,
			variableBinding: this.variableBinding,
			title: this.title,
			mode: this.mode,
      note: this.note,
      sparql: sparql,
			possibleValues: this.possibleValues.map(value => value.toJSON())
		};
	},

  fromJSON(json) {
    let sparql = {};
    if (json.sparql != undefined) {
      sparql.repo = json.sparql.repo;
      sparql.query = decodeURI(json.sparql.query);
    }
		this.label = json.label;
		this.variable = json.variable;
		this.variableBinding = json.variableBinding;
		this.mode = json.mode;
    this.note = json.note;
    this.sparql = sparql;
		if (!json.possibleValues) json.possibleValues = [];
		this.possibleValues = json.possibleValues.map(value => {
			let val = ValueChoice.create();
			val.fromJSON(value);
			return val;
		});
	}
});

let ValueChoice = EmberObject.extend({
	label: null,
	dataValue: null,

	toJSON() {
		return {
			label: this.label,
			dataValue: this.dataValue
		};
	},

	fromJSON(json) {
		this.label = json.label;
		this.dataValue = json.dataValue;
	}
});

export {Parameter, Template, ValueChoice};
