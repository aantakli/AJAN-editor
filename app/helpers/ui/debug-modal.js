/*
 * Created on Tue Nov 10 2020
 *
 * The MIT License (MIT)
 * Copyright (c) 2020 André Antakli, Xueting Li (German Research Center for Artificial Intelligence, DFKI).
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
import { BT, RDF, RDFS, AGENTS } from "ajan-editor/helpers/RDFServices/vocabulary";

export default {
  createDebugModal: createDebugModal
};

function createDebugModal(info) {
  console.log("BT-Node: Debug information");
  $("#modal-header-title").text("BT-Node: Debug information");
  let $body = $("#modal-body"),
    $modal = $("#universal-modal");
  $body.empty();
  $modal.show();

  if (info) {
    getInfoHTML(info, $body);
    getResultHTML(info, $body);
  }
}

function getInfoHTML(info, $body) {
  let general = info[0][0];
  let $info = $("<div>", {});
  $info.append($("<h2>Node Information</h2>"));
  $info.append($("<p>", {
    class: "modal-p"
  }).append("<b>Agent:</b> " + general.agent));
  $info.append($("<p>", {
    class: "modal-p"
  }).append("<b>Label:</b> " + general.label));
  $info.append($("<p>", {
    class: "modal-p"
  }).append("<b>BT:</b> " + general.bt));
  $info.append($("<p>", {
    class: "modal-p"
  }).append("<b>Node:</b> " + general.node));

  let $infoDiv = $("<div>", {
    class: "modal-body-div"
  }).append($info);
  // Append to modal body
  $body.append($infoDiv);
}

function getResultHTML(info, $body) {
  let result = info[1];
  let $result = $("<div>", {});
  $result.append($("<hr><h3>Node Result</h3>"));

  let report = null;
  let subjects = new Array();
  result.forEach(function (quad) {
    if (quad.predicate.value === RDF.type && quad.object.value === BT.Report) {
      report = quad.subject.value;
    }
  });

  result.forEach(function (quad) {
    if (quad.subject.value != report) {
      if (subjects[quad.subject.value] === undefined) {
        subjects[quad.subject.value] = new Array();
      } 
      subjects[quad.subject.value].push({
        predicate: quad.predicate.value,
        object: quad.object.value
      });
    }
  });

  console.log(subjects);

  let key;
  for (key in subjects) {
    console.log(key);
    let $input = $("<div>", {});
    $input.append($("<h4>" + key + "</h4>"));
    let values = subjects[key];
    if (Array.isArray(values)) {
      values.forEach(function (info) {
        let $row = $("<p>", {});
        $row.append("<b>" + info.predicate + "</b> " + info.object);
        $input.append($row);
      });
    }
    $result.append($input);
  }

  let $resultDiv = $("<div>", {
    class: "modal-body-div"
  }).append($result);
  // Append to modal body
  $body.append($resultDiv);
}
