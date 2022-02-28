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
import { BT, RDF, RDFS, XSD } from "ajan-editor/helpers/RDFServices/vocabulary";
import nodeDefs from "ajan-editor/helpers/RDFServices/node-definitions/node-defs";
import rdf from "npm:rdf-ext";
import rdfGraph from "ajan-editor/helpers/RDFServices/RDF-graph";
import rdfManager from "ajan-editor/helpers/RDFServices/RDF-manager";
import util from "ajan-editor/helpers/RDFServices/utility";
import globals from "ajan-editor/helpers/global-parameters";
import rdfFact from "ajan-editor/helpers/RDFServices/RDF-factory";
import rdfTree from "ajan-editor/helpers/RDFServices/manager/tree";

// Remove RDF data for a given node
export default {
  cloneBT
};

function cloneBT(nodeURI, bts, label) {
  let bt = new Array();
  let nodes = new Array();
  rdfTree.visitNode(nodeURI, nodes, bts);
  let uris = createNewURIs(nodes);
  nodes.forEach(uri => {
    let quads = rdfGraph.getAllQuads(uri);
    quads.forEach(quad => {
      bt.push(quad);
    })
  });
  let newBt = cloneOldBT(nodeURI, bt, uris);
  if (bt === newBt)
    console.log("Cloned BT is a real clone:" + false);
  else
    console.log(newBt);
  return newBt;
}

function createNewURIs(nodes) {
  let uris = new Array();
  nodes.forEach(uri => {
    if (uri.includes("http://")) {
      let newUri = globals.baseURI + util.generateUUID();
      uris.push({ old: uri, new: newUri });
    } else {
      uris.push({ old: uri, new: rdfFact.blankNode().value });
    }
  });
  return uris;
}

function cloneOldBT(nodeURI, oldBt, uris) {
  let newBt = new Array();
  oldBt.forEach(quad => {
    let newQuad;
    if (quad.subject.value == nodeURI && quad.predicate.value == RDFS.label) {
      newQuad = rdfFact.quadLiteral(
        getNewUri(quad.subject.value, uris),
        quad.predicate.value,
        quad.object.value + "_clone",
        quad.object.datatype.value
      );
    } else {
      if (quad.object.termType == "Literal") {
        newQuad = rdfFact.quadLiteral(
          getNewUri(quad.subject.value, uris),
          quad.predicate.value,
          quad.object.value,
          quad.object.datatype.value
        );
      } else {
        newQuad = rdfFact.quad(
          getNewUri(quad.subject.value, uris),
          quad.predicate.value,
          getNewUri(quad.object.value, uris)
        );
      }
    }
    newBt.push(newQuad);
  });
  return newBt;
}

function getNewUri(oldUri, uris) {
  let value = oldUri;
  uris.forEach(entry => {
    if (oldUri == entry.old) {
      value = entry.new;
    }
  });
  return value;
}
