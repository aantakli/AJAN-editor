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
import autocompleteTokens from "ajan-editor/helpers/sparql-editor/autocomplete/autocompleteTokens";

class TokenManager {
  constructor() {
    this.computeClassifiedCompletions();
  }

  computeClassifiedCompletions(){
    this.subjects = getSubjectCompletions();
    this.predicates = getPredicateCompletions();
    this.objects = getObjectCompletions();
    this.allTokens = getAllTokens();
  }

  get classifiedCompletions(){
    return {
      "subjects": this.subjects,
      "predicates": this.predicates,
      "objects": this.objects,
    }
  }

}

function getSubjectTokens() {
  return [
    ...autocompleteTokens["resources"],
    ...autocompleteTokens["resources_noprefix"]
  ];
}

function getPredicateTokens() {
  return [
    ...autocompleteTokens["predicate_uris"],
    ...autocompleteTokens["predicate_uris_noprefix"]
  ];
}

function getObjectTokens() {
  return [
    ...autocompleteTokens["resources"],
    ...autocompleteTokens["resources_noprefix"],
    ...autocompleteTokens["literals"]
  ];
}

function getAllTokens() {
  return [
    ...autocompleteTokens["predicate_uris"],
    ...autocompleteTokens["predicate_uris_noprefix"],
    ...autocompleteTokens["resources"],
    ...autocompleteTokens["resources_noprefix"],
    ...autocompleteTokens["literals"]
  ];
}

function mapSubjectTokens(tokens) {
  return tokens.map(token => {
    return getCompletionObject(token, "Subject");
  });
}

function mapPredicateTokens(tokens) {
  return tokens.map(token => {
    return getCompletionObject(token, "Predicate");
  });
}

function mapObjectTokens(tokens) {
  return tokens.map(token => {
    return getCompletionObject(token, "Object");
  });
}

function getCompletionObject(token, type) {
  return {
    value: token,
    name: token,
    meta: type,
    caption: token,
    score: 1
  };
}

function getSubjectCompletions() {
  let tokens = getSubjectTokens();
  return mapSubjectTokens(tokens);
}

function getPredicateCompletions() {
  let tokens = getPredicateTokens();
  return mapPredicateTokens(tokens);
}

function getObjectCompletions() {
  let tokens = getObjectTokens();
  return mapObjectTokens(tokens);
}

export {TokenManager}
