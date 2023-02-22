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
import Component from "@ember/component";
import { BT, AGENTS, XSD, RDF, RDFS } from "ajan-editor/helpers/RDFServices/vocabulary";

let that;
let SparqlParser = require('sparqljs').Parser;
let parser = new SparqlParser({ skipValidation: true });

export default Component.extend({
  validation: undefined,

  init() {
    this._super(...arguments);
    that = this;
  },

  didInsertElement() {
    validateTextArea(this);
  },

  didUpdateAttrs() {
    validateTextArea(this);
  },

	actions: {
		adjustHeight: function(event) {
			let target = event.target;
			target.style.height = "auto";
			target.style.height = 22 + target.scrollHeight + "px";
    },

    loadFile() {
      console.log("upload file");
      loadFile(event)
    }
	}
});

function validateTextArea(comp) {
  let types = comp.get("types");
  if (types && types.length > 0) {
    if (types.includes(BT.AskQuery)
      || types.includes(BT.SelectQuery)
      || types.includes(BT.ConstructQuery)
      || types.includes(BT.UpdateQuery)) {
      validateQuery(comp, types);
    }
  }
}

function validateQuery(comp, types) {
  try {
    let result = parser.parse(comp.get("value"));
    if (types.includes(BT.AskQuery)) {
      setQueryValidation(comp, result.queryType, "ASK");
    } else if (types.includes(BT.SelectQuery)) {
      setQueryValidation(comp, result.queryType, "SELECT");
    } else if (types.includes(BT.ConstructQuery)) {
      setQueryValidation(comp, result.queryType, "CONSTRUCT");
    } else if (types.includes(BT.UpdateQuery)) {
      setQueryValidation(comp, result.type.toUpperCase(), "UPDATE");
    }
  } catch (error) {
    comp.set("validation", error);
  }
}

function setQueryValidation(comp, resultType, queryType) {
  if (resultType != queryType) {
    comp.set("validation", "Wrong query Type! It has to be an " + queryType + " Query.");
  } else {
    comp.set("validation", undefined);
  }
}

function loadFile(event) {
  let file = event.target.files[0];
  console.log("File: " + file.name);
  var reader = new FileReader();
  reader.onload = function () {
    that.set("value", content);
  };
  reader.readAsText(file);
}
