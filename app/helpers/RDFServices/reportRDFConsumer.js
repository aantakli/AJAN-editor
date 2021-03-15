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
import {BT, ACTN, RDF, RDFS, DCT, HTTP, SPIN, AGENTS} from "ajan-editor/helpers/RDFServices/vocabulary";
import JsonLdParser from "npm:rdf-parser-jsonld";
import rdf from "npm:rdf-ext";
import stringToStream from "npm:string-to-stream";

let parser = new JsonLdParser();

export default {
  getReportGraph: getReportGraph
};

function getReportGraph(data) {
  console.log("get report graph");
	const quadStream = parser.import(stringToStream(data));

	let obj = rdf
		.dataset()
		.import(quadStream)
		.then(function(dataset) {
      let reports = new Array();
      getReport(dataset, reports);
      return reports;
		});
	return Promise.resolve(obj);
}

function getReport(graph, reports) {
	Promise.resolve(graph).then(function(graph) {
		graph.forEach(quad => {
			if (
				quad.predicate.value === RDF.type
				&& quad.object.value === BT.Report
      ) {
        reports.push(getReportDefinition(graph, quad.subject));
      }
		});
	});
}

function getReportDefinition(graph, resource) {
  let report = {};
  graph.forEach(function (quad) {
    if (quad.subject.equals(resource)) {
      if (quad.predicate.value === AGENTS.agent) {
        report.agent = quad.object.value;
      }
      if (quad.predicate.value === BT.debugging) {
        report.debugging = quad.object.value;
      }
      if (quad.predicate.value === RDFS.label) {
        report.label = quad.object.value;
      }
      if (quad.predicate.value === BT.btNode) {
        report.node = quad.object.value;
      }
    }
  });
  return report;
}
