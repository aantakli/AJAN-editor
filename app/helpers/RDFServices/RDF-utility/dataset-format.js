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
function graphDatasetBeautify(dataset, prefixes) {
  if (!dataset) return;
  return Promise.resolve(dataset)
    .then(x => {
      return x._quads.map(quad => {
        return {
            subject: getValue(quad.subject, prefixes),
            predicate: getValue(quad.predicate, prefixes),
            object: getValue(quad.object, prefixes)
          };
      })
	});
}

function csvDatasetBeautify(dataset, prefixes) {
  if (!dataset) return;
  let beauty = [];
  dataset.forEach(item => {
    let object = {}
    let empty = false;
    for (const [key, value] of Object.entries(item)) {
      if (!value) {
        empty = true;
        break;
      }
      object[key] = replaceWithPrefix(value, prefixes);
    }
    if (!empty)
      beauty.push(object);
  })
  return beauty;
}

function getValue(term, prefixes) {
	let value = term.value;
	if (term.termType === "NamedNode") {
		value = replaceWithPrefix(value, prefixes);
	} else if (
		term.datatype
			? term.datatype.value === "http://www.w3.org/2001/XMLSchema#string"
			: false
	) {
		value = `"${value}"`;
	}
	return value;
}

function replaceWithPrefix(str, prefixes) {
	// let prefixes = getPrefixes();
	for (let i in prefixes) {
		let prefix = prefixes[i];
		if (str.startsWith(prefix.iri))
			return str.replace(prefix.iri, prefix.label);
	}
	return str;
}

export {graphDatasetBeautify, csvDatasetBeautify};
