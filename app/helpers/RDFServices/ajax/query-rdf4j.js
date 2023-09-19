/* eslint-disable sort-imports */
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
import token from "ajan-editor/helpers/token";
import Ember from "ember";

function sendQuery(ajax, repository, query, contentType = "application/ld+json") {
  if (!query) throw "Empty query";

  let result = Promise.resolve(token.resolveToken(ajax, localStorage.currentStore))
    .then((token) => {
      return Ember.$.ajax({
        url: repository,
        type: "POST",
        contentType: "application/sparql-query; charset=utf-8",
        headers: getHeaders(token, contentType),
        data: query.toString()
      })
        .then(handleAjaxReturn)
        .catch(function (error) {
          console.warn("Error while loading intermediate query results", error);
        });
    });
  return Promise.resolve(result);
}

function sendFile(ajax, repository, content) {
  if (!content) throw "No content";
  let result = Promise.resolve(token.resolveToken(ajax, localStorage.currentStore))
    .then((token) => {
      return Ember.$.ajax({
        url: repository + "/statements",
        type: "POST",
        headers: getHeaders(token, "application/trig; charset=utf-8"),
        contentType: "application/trig",
        data: content
      })
        .then(handleAjaxFileReturn)
        .catch(function (error) {
          console.warn("Error while loading intermediate query results", error);
      });
    });
  return Promise.resolve(result);
}

function deleteRepo(ajax, repository, query) {
  let result = Promise.resolve(token.resolveToken(ajax, localStorage.currentStore))
    .then((token) => {
      return Ember.$.ajax({
        url: repository + "/statements",
        type: "POST",
        headers: getHeaders(token, "application/x-www-form-urlencoded; charset=utf-8"),
        contentType: "application/x-www-form-urlencoded",
        data: "update=" + query.toString()
      })
        .then(handleAjaxFileReturn)
        .catch(function (error) {
          console.warn("Error while loading intermediate query results", error);
        });
    });
  return Promise.resolve(result);
}

function sendSelectQuery(ajax, repository, query) {
  if (!query) throw "Empty query";
  let result = Promise.resolve(token.resolveToken(ajax, localStorage.currentStore))
    .then((token) => {
      return Ember.$.ajax({
        url: repository,
        type: "POST",
        contentType: "application/sparql-query; charset=utf-8",
        headers: getHeaders(token, "text/csv; charset=utf-8"),
        data: query.toString()
      }).then(handleAjaxSelectReturn)
        .catch(function (error) {
          console.warn("Error while loading intermediate query results", error);
        });
    });
  return Promise.resolve(result);
}

function sendAskQuery(ajax, repository, query) {
	if (!query) throw "Empty query";
  let result = Promise.resolve(token.resolveToken(ajax, localStorage.currentStore))
    .then((token) => {
      return Ember.$.ajax({
		    url: repository,
		    type: "POST",
		    contentType: "application/sparql-query; charset=utf-8",
        headers: getHeaders(token, "text/boolean"),
		    data: query.toString()
	    })
		    .then(handleAjaxAskReturn)
		    .catch(function(error) {
			    console.warn("Error while loading intermediate query results", error);
        });
    });
  return Promise.resolve(result);
}

function getHeaders(token, accept) {
  if (token) {
    return {
      Authorization: "Bearer " + token,
      Accept: accept,
    }
  } else {
    return {
      Accept: accept,
    }
  }
}

function handleAjaxReturn(result) {
  return result;
}

function handleAjaxAskReturn(result) {
	return result;
}

function handleAjaxFileReturn(result) {
  return result;
}

function handleAjaxSelectReturn(result) {
  return result;
}

export { sendAskQuery, sendSelectQuery, sendQuery, sendFile, deleteRepo};
