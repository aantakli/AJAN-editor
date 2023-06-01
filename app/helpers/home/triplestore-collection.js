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
import Ember from "ember";
import {TriplestoreListing} from "ajan-editor/helpers/home/triplestore-listing";

let $ = Ember.$;

class TriplestoreCollection {
	constructor(parentComponent) {
		this.parentComponent = parentComponent;
		this.getTripleStores();
		this.insertTriplestores();
	}

	getTripleStores() {
		try {
			this.triplestores = JSON.parse(localStorage.triplestores);
		} catch (err) {
			this.triplestores = [];
		}
	}

	insertTriplestores() {
		this.$list = $("#triplestore-list");
		this.triplestores.forEach(triplestore => {
			new TriplestoreListing(triplestore, this.parentComponent);
		});
	}

  insertNewTriplestore() {
    let triplestore = getNewTriplestore();
    if (!checkExistence(this, triplestore)) {
      new TriplestoreListing(triplestore, this.parentComponent);
      this.triplestores.push(triplestore);
      localStorage.triplestores = JSON.stringify(this.triplestores);
    }
  }

  insertDefinedTriplestore(name, uri) {
    let triplestore = getNewTriplestore(name, uri);
    if (!checkExistence(this, triplestore)) {
      new TriplestoreListing(triplestore, this.parentComponent);
      this.triplestores.push(triplestore);
      localStorage.triplestores = JSON.stringify(this.triplestores);
    }
  }
}

function checkExistence(that, triplestore) {
  let existing = false;
  that.triplestores.forEach(item => {
    if (!existing) {
      if (item.label == triplestore.label) {
        existing = true;
      }
    }
  });
  return existing;
}


function getNewTriplestore() {
	return {
    label: getLabel(),
    secured: getSecured(),
    token: "",
    expiration: 0,
		uri: getURI()
	};
}

function getNewTriplestore(name, uri) {
  return {
    label: name,
    secured: false,
    token: "",
    expiration: 0,
    uri: uri
  };
}

function getLabel() {
	return $("#label").val();
}

function getSecured() {
  return $("#secured")[0].checked;
}

function getURI() {
	return $("#uri").val();
}

export {TriplestoreCollection};
