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
import { ND, RDF } from "ajan-editor/helpers/RDFServices/vocabulary";
import ndParameter from "./parameter";
import ndParameterSet from "./parameter-set";
import ndList from "./list";
import util from "./util";

// Construct a list of parameters
export default function(quads, URI) {
  let first = util.getObjectValue(quads, URI, ND.first);
  let last = util.getObjectValue(quads, URI, ND.last);
  let firstSet = getSet(first, quads);
  let lastSet = getSet(last, quads);

  return {
    title: util.getObjectValue(quads, URI, ND.title),
    first: firstSet,
    last: lastSet
  };
}

function getSet(URI, quads) {
  let toggleSet = {};
  toggleSet.toggle = [];
  toggleSet.parameters = [];
  toggleSet.parameterSets = [];
  toggleSet.list = [];

  quads.forEach(quad => {
    if (quad.subject.value === URI) {
      if (quad.predicate.value === RDF.type) {
        switch (quad.object.value) {
          case ND.Toggle:
            toggleSet.toggle.push(ndToggle(quads, URI));
            break;
          case ND.Parameter:
            toggleSet.parameters.push(ndParameter(quads, URI));
            break;
          case ND.ParameterSet:
            toggleSet.parameterSets.push(ndParameterSet(quads, URI));
            break;
          case ND.List:
            toggleSet.list.push(ndList(quads, URI));
            break;
          default:
            break;
        }
      }
    }
  });
  return toggleSet;
}
