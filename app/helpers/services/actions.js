/*
 * Created on Tue Nov 10 2020
 *
 * The MIT License (MIT)
 * Copyright (c) 2020 André Antakli (German Research Center for Artificial Intelligence, DFKI).
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
import { ACTN, HTTP } from "ajan-editor/helpers/RDFServices/vocabulary";
import ajaxActions from "ajan-editor/helpers/services/actions/ajax";
import rdfGraph from "ajan-editor/helpers/RDFServices/RDF-graph";
import rdfFact from "ajan-editor/helpers/RDFServices/RDF-factory";
import utility from "ajan-editor/helpers/RDFServices/utility";
import globals from "ajan-editor/helpers/global-parameters";
import serviceProducer from "ajan-editor/helpers/RDFServices/servicesRDFProducer";

import rdf from "npm:rdf-ext";
import N3 from "npm:rdf-parser-n3";
import stringToStream from "npm:string-to-stream";
import consumer from "ajan-editor/helpers/RDFServices/servicesRDFConsumer";

export default {
	// Delete Service Object
	deleteService: deleteService,
	deleteBinding: deleteBinding,

	// Create Service Object
	createDefaultService: createDefaultService,
	createDefaultBinding: createDefaultBinding,

	// Create RDF Service
	createService: serviceProducer.createService,
	createVariables: serviceProducer.createVariables,
	appendVariable: serviceProducer.appendVariable,
	createVariable: serviceProducer.createVariable,
	createBinding: serviceProducer.createBinding,
	createPayload: serviceProducer.createPayload,

	// AJAX related Actions
	getActions: ajaxActions.getActions,
	getFromServer: ajaxActions.getFromServer,
  saveGraph: ajaxActions.saveGraph,
  readTTLInput: readTTLInput,
  getMatches: getMatches,
  importActions: importActions
};

function deleteService(service) {
	console.log(service);
	rdfGraph.removeAllRelated(service.uri);
	service.variables.forEach(item => {
		rdfGraph.removeAllRelated(item.uri);
		rdfGraph.removeAllRelated(item.pointerUri);
	});
	rdfGraph.removeAllRelated(service.consumes.uri);
	rdfGraph.removeAllRelated(service.produces.uri);
	deleteBinding(service.run);
	deleteBinding(service.abort);
}

function deleteBinding(binding) {
	if(binding != null) {
    rdfGraph.removeAllRelated(binding.uri);
    rdfGraph.removeAllRelated(binding.accept.uri);
    rdfGraph.removeAllRelated(binding.accept.pointerUri);
    rdfGraph.removeAllRelated(binding.contentType.uri);
    rdfGraph.removeAllRelated(binding.contentType.pointerUri);
		rdfGraph.removeAllRelated(binding.payload.uri);
	}
}

function createDefaultService(repo) {
  let service = {};
  service.uri = repo + "services#SA_" + utility.generateUUID();
  service.communication = "Synchronous";
  service.label = "ServiceAction";
  service.run = createDefaultBinding(repo);
  service.variables = [{uri: rdfFact.blankNode().value, var: "s"}];
  service.consumes = {uri: rdfFact.blankNode().value, sparql: "ASK WHERE {?s ?p ?o}"};
  service.produces = {uri: rdfFact.blankNode().value, sparql: "ASK WHERE {?s ?p ?o}"};
  return service;
}

function createDefaultBinding(repo) {
  let binding = {};
  binding.uri = repo + "services#Binding_" + utility.generateUUID();
	binding.version = "1.1";
	binding.mthd = HTTP.Post;
  binding.requestUri = "http://something";
  binding.accept = { uri: "", pointerUri: "", value: "text/turtle" };
  binding.contentType = { uri: "", pointerUri: "", value: "text/turtle" };
	let payload = {};
	payload.uri = rdfFact.blankNode().value;
  payload.sparql = "CONSTRUCT {?s ?p ?o} WHERE {?s ?p ?o}";
	binding.payload = payload;
  return binding;
}

function readTTLInput(content, onend) {
  console.log("readTTLInput");
  let parser = new N3({ factory: rdf });
  let quadStream = parser.import(stringToStream(content));
  let importFile = {
    info: { contains: [] },
    raw: content,
    quads: [],
    objects: [],
    resources: []
  };
  let result = consumer.getActionsGraph(quadStream, true);
  result.then(function (result) {
    importFile.objects = result[0].services;
    importFile.resources = result[0].services.map(obj => { return obj.uri });
    console.log(importFile.objects);
    importFile.objects.forEach(obj => {
      importFile.info.contains.push({
        type: ACTN.ServiceAction,
        uri: obj.uri,
        name: obj.label
      });
    });
    onend(importFile);
  });
}

function getMatches(importFile, availableServices) {
  let matches = [];
  importFile.objects.forEach(obj => {
    let match = availableServices.find((item) => item.uri == obj.uri);
    if (match != undefined) {
      match.import = true;
      match.match = true;
      matches.push(match);
    } else {
      obj.import = true;
      obj.match = false;
      matches.push(obj);
    }
  });
  return matches;
}

function importActions(repo, importFile, bus, availableServices, matches, ajax, onend) {
  matches.actions.forEach(match => {
    if (match.import && match.match) {
      let oldDef = availableServices.find((item) => item.uri == match.uri);
      deleteService(oldDef);
    }
    if (match.import) {
      let newDef = importFile.objects.find((item) => item.uri == match.uri);
      serviceProducer.createService(newDef);
    }
  });
  if (ajax)
    ajaxActions.saveGraph(ajax, repo, bus, "updated", onend);
  else
    ajaxActions.saveGraph(globals.ajax, repo, bus, "updated", onend);
}
