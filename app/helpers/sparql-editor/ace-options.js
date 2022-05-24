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
import {getSparqlKeywords} from "ajan-editor/helpers/sparql-editor/autocomplete/sparql-manager";
import {TokenManager} from "ajan-editor/helpers/sparql-editor/autocomplete/token-manager";

function getOptions(that) {
	let fontSize = that.get("fontSize") ? that.get("fontSize") : "15pt";

	return {
		fontSize: fontSize,
		// useWrapMode: true,
		highlightActiveLine: true,
		showPrintMargin: false,
		//theme: "ace/theme/chaos",
		mode: "ace/mode/sparql",
		value: "CONSTRUCT \nWHERE{\n\t?s ?p ?o  \n}",

		scrollPastEnd: 1,

		// suggestCompletions: suggestCompletions,
		enableBasicAutocompletion: true,
		enableLiveAutocompletion: true
		// enableSnippets: true,
		// suggestCompletions: [suggestCompletions]
	};
}

function getCustomCompleter(prefixes, snippets) {
	let tokenManager = new TokenManager();
	let defaultCompletions = getDefaultCompletions(snippets);
	let prefixCompletion = prefixes;

	return {
		getCompletions: function(editor, session, pos, prefix, callback) {
			let completions = [];
			let lineTokens = session.getTokens(pos.row);
			let previousTripleTokens = getPreviousTripleTokens(lineTokens);
			let line = session
				.getLine(pos.row)
				.trim()
				.toUpperCase();

			completions = getPositionalCompletions(
				previousTripleTokens,
				tokenManager
			);
			completions = getVocabularyCompletions(
				completions,
				line,
				previousTripleTokens,
				prefixCompletion
			);
			completions = concatDefaultCompletions(completions, defaultCompletions);

			callback(null, completions);
		}
	};
}

function getPreviousTripleTokens(lineTokens) {
	let previousTripleTokens = 0;
	lineTokens.some(token => {
		// break if at current token
		if (token.index) return true;
		if (token && token.type && token.type !== "text") previousTripleTokens += 1;
	});
	return previousTripleTokens;
}

function getPositionalCompletions(previousTripleTokens, tokenManager) {
	switch (previousTripleTokens) {
		case 0:
			return tokenManager.subjects;
		case 1:
			return tokenManager.predicates;
		case 2:
			return tokenManager.objects;
		default:
			return tokenManager.allTokens;
	}
}

function getVocabularyCompletions(
	completions,
	line,
	previousTripleTokens,
	prefixCompletion
) {
	if (line.startsWith("PREFIX") && previousTripleTokens === 1) {
		return completions.concat(prefixCompletion);
	}
	return completions;
}

function getDefaultCompletions(snippets) {
	let defaultCompletions = [];
	let sparqlKeywords = getSparqlKeywords();

	return defaultCompletions.concat(snippets, sparqlKeywords);
}

function concatDefaultCompletions(completions, defaultCompletions) {
	return completions.concat(defaultCompletions);
}

export {getCustomCompleter, getOptions};
