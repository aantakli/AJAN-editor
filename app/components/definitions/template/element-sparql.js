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
import {
  sendSelectQuery
} from "ajan-editor/helpers/RDFServices/ajax/query-rdf4j";
import { ValueChoice } from "ajan-editor/objects/definitions/template";
import { XSD, RDFS } from "ajan-editor/helpers/RDFServices/vocabulary";

export default Component.extend({
  init() {
    this._super(...arguments);
  },
 
  actions: {
    updateChoices: function() {
      let promise = sendSelectQuery(this.get("param.sparql.repo"), this.get("param.sparql.query"));
      promise.then(data => {
        if (data[0].label != "" && data[0].dataValue != "") {
          this.set("param.possibleValues", []);
          for (var i = 0; i < data.length; i++) {
            let param = ValueChoice.create();
            param.label = data[i].label;
            param.dataValue = getLiteral(data[i].dataValue, data[i].dataType);
            this.get("param.possibleValues").pushObject(param);
          }
        }
      });
    }
  }
});

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
