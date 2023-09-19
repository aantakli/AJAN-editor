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
import Component from '@ember/component';
import Ember from "ember";
import {
  sendSelectQuery
} from "ajan-editor/helpers/RDFServices/ajax/query-rdf4j";
import { ValueChoice } from "ajan-editor/objects/definitions/template";
import { RDFS, XSD } from "ajan-editor/helpers/RDFServices/vocabulary";

let ajax = null;

export default Component.extend({
  ajax: Ember.inject.service(),

  init() {
    this._super(...arguments);
  },
 
  actions: {
    updateChoices: function () {
      let promise = sendSelectQuery(ajax, this.get("param.sparql.repo"), this.get("param.sparql.query"));
      promise.then(data => {
        console.log(data);
        let rows = data.split("\n");
        if (rows[0] != "") {
          this.set("param.possibleValues", []);
          for (let i = 1; i < rows.length; i++) {
            console.log(rows[i]);
            let row = rows[i].split(",");
            let param = ValueChoice.create();
            param.label = row[getBindingID(rows[0], "label")];
            param.dataValue = getLiteral(row[getBindingID(rows[0], "dataValue")], row[getBindingID(rows[0], "dataType")]);
            this.get("param.possibleValues").pushObject(param);
          }
        }
      });
    }
  }
});

function getBindingID(header, string) {
  let headers = header.split(",");
  for (let i = 0; i < headers.length; i++) {
    if (headers[i] == string) return i;
  }
  return 0;
}

function getLiteral(data, type) {
  let result = undefined;
  switch (type) {
    case RDFS.Resource:
      result = "<" + data + ">";
      break;
    case XSD.double:
      result = '"' + data + '"^^xsd:double';
      break;
    case XSD.float:
      result = '"' + data + '"^^xsd:float';
      break;
    case XSD.anyURI:
      result = '"' + data + '"^^xsd:anyURI';
      break;
    case XSD.long:
      result = '"' + data + '"^^xsd:long';
      break;
    case XSD.int:
      result = '"' + data + '"^^xsd:int';
      break;
    case XSD.boolean:
      result = '"' + data + '"^^xsd:boolean';
      break;
    case XSD.string:
      result = '"' + data + '"^^xsd:string';
      break;
    default:
      result = '"' + data + '"^^xsd:string';
  }
  return result;
}
