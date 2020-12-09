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
import {BT, XSD} from "ajan-editor/helpers/RDFServices/vocabulary";
import {computed, observer} from "@ember/object";
import {inject} from "@ember/service";
import Mixin from "@ember/object/mixin";
import rdfGraph from "ajan-editor/helpers/RDFServices/RDF-graph";
import {Template} from "ajan-editor/objects/definitions/template";

export default Mixin.create({
	queryInsertion: inject("behaviors/query-insertion-manager"),

	originBasePredicate: BT.originBase,
	targetBasePredicate: BT.targetBase,

	nodeType: computed("queryInsertion.nodeType", function() {
		return this.get("queryInsertion.nodeType");
	}),

	template: computed("uri", function() {
		return getTemplate(this.uri);
	}),

	templateChanged: observer("template", function() {
		setTemplate(this.uri, this.template);
	}),

	templateChangedViaModal: observer("queryInsertion.template", function() {
		this.set("template", this.get("queryInsertion.template"));
		setTemplate(this.uri, this.template);
	}),

	queryValue: computed("uri", function() {
		return rdfGraph.getObjectValue(this.get("uri"), BT.sparql) || "";
	}),

	queryChangedViaTemplate: observer(
		"template.parameters.@each.variableBinding",
		function() {
      setTemplate(this.uri, this.get("template"));
      if (this.get("template") != undefined)
			  this.set("queryValue", this.get("template").toSparql());
		}
	),

	queryChanged: observer("queryValue", function() {
		rdfGraph.setObjectValue(this.get("uri"), BT.sparql, this.get("queryValue"));
	}),

	targetBaseChanged: observer("queryInsertion.targetBase", function() {
		let structure = this.get("structure");
		let uri = this.get("uri");
		let newBase = this.get("queryInsertion.targetBase");
		if (newBase) {
			if (structure.originBase) return setOriginBase(uri, newBase);
			if (structure.targetBase) return setTargetBase(uri, newBase);
		}
	}),

	baseValue: computed("uri", function() {
		let structure = this.get("structure");
		let uri = this.get("uri");

		if (structure.originBase) return getOriginBase(uri);
		else if (structure.targetBase) return getTargetBase(uri);
		else return getBeliefBase(uri);
	}),

	hasOriginBase: computed("uri", function() {
		return this.get("structure.originBase");
	}),

	hasTargetBase: computed("uri", function() {
		return this.get("structure.targetBase");
	}),

	originBase: computed("uri", function() {
		return getOriginBase(this.get("uri"));
	}),

	targetBase: computed("uri", function() {
		return getTargetBase(this.get("uri"));
	}),

	originBaseValueChanged: observer("originBase", function() {
		let uri = this.get("uri");
		let value = this.get("originBase") || "http://";
		setOriginBase(uri, value);
	}),

	targetBaseValueChanged: observer("targetBase", function() {
		let uri = this.get("uri");
		let value = this.get("targetBase") || "http://";
		setTargetBase(uri, value);
	}),

	baseChanged: observer("baseValue", function() {
		let structure = this.get("structure");
		let uri = this.get("uri");
		let value = this.get("baseValue") || "http://";

		if (structure.originBase) setOriginBase(uri, value);
		else if (structure.targetBase) setTargetBase(uri, value);
		else setBeliefBase(uri, value);
	}),

	baseChangedViaTemplate: observer("template", function() {
		let structure = this.get("structure");
		let uri = this.get("uri");
		let newBase = this.get("template.targetBase");
		if (newBase) {
			if (structure.originBase) return setOriginBase(uri, newBase);
			if (structure.targetBase) return setTargetBase(uri, newBase);
		}
	})
});

function getTemplate(uri) {
  let templateString = rdfGraph.getObjectValue(uri, BT.queryTemplate);
  let query = rdfGraph.getObjectValue(uri, BT.queryTemplateDefaultQuery);
	if (!templateString) return;
 
  let templateJson = JSON.parse(templateString);
	// Reassemble query
	templateJson.query = query;
	let template = Template.create();
	template.fromJSON(templateJson);
	return template;
}

function setTemplate(uri, template) {
	if (!template) return;
	let templateJson = template.toJSON();
	// Store query separately due to encoding issues
	let query = templateJson.query;
	templateJson.query = "";
	let templateString = JSON.stringify(templateJson);
	templateString = templateString.replace(/\\"/g, "'");

	rdfGraph.setObjectValue(uri, BT.queryTemplate, templateString, XSD.string);
	rdfGraph.setObjectValue(uri, BT.queryTemplateDefaultQuery, query, XSD.string);
}

function getBeliefBase(uri) {
	return rdfGraph.getObjectValue(uri, BT.beliefBase) || "";
}

function getOriginBase(uri) {
	return rdfGraph.getObjectValue(uri, BT.originBase) || "";
}

function getTargetBase(uri) {
	return rdfGraph.getObjectValue(uri, BT.targetBase) || "";
}

function setBeliefBase(uri, value) {
	rdfGraph.setObjectValue(uri, BT.beliefBase, value, XSD.anyURI);
}

function setOriginBase(uri, value) {
	rdfGraph.setObjectValue(uri, BT.originBase, value, XSD.anyURI);
}

function setTargetBase(uri, value) {
	rdfGraph.setObjectValue(uri, BT.targetBase, value, XSD.anyURI);
}
