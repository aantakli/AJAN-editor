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
import {BT, ND} from "ajan-editor/helpers/RDFServices/vocabulary";
import util from "./util";

// Construct a single parameter
export default function(quads, URI) {
	//TODO: parse input into sth that's easier to read than an URI?
	let input = util.getObjectValue(quads, URI, ND.input);
	let defaultVal = util.getObjectValue(quads, URI, ND.default);
  let types = util.getObjectValues(quads, URI, ND.type);
  let mandatory = util.getObjectValues(quads, URI, ND.mandatory);
	let output = {
		//TODO: If parameter is inside a list, it maps directly to the blank parent node
		mapping: util.getObjectValue(quads, URI, ND.mapsTo),
		title: util.getObjectValue(quads, URI, ND.title),
		types,
		input: input,
    default: defaultVal,
    mandatory: mandatory
	};
	// Add additional data if the parameter is a query
	if (input === ND.Query) {
		output.originBase =
			util.getObjectValue(quads, URI, BT.originBase) === "true";
		output.targetBase =
      util.getObjectValue(quads, URI, BT.targetBase) === "true";
	}
	return output;
}
