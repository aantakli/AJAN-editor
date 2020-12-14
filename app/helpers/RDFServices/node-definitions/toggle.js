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
import { ND } from "ajan-editor/helpers/RDFServices/vocabulary";
import ndParameter from "./parameter";
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
  quads.forEach(quad => {
    if (quad.subject.value === URI) {
      let objURI = quad.object.value;
      switch (quad.predicate.value) {
        case ND.toggle:
          toggle.push(ndToggle(quads, objURI));
          break;
        case ND.parameter:
          parameters.push(ndParameter(quads, objURI));
          break;
        case ND.parameters:
          parameters = parameters.concat(ndParameters(quads, objURI));
          break;
        case ND.parameterSet:
          parameterSets.push(ndParameterSet(quads, objURI));
          break;
        case ND.list:
          list.push(ndList(quads, objURI));
          break;
        default:
          break;
      }
    }
  });
}
