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

function createDebugModal(info, prefixes) {
  console.log("BT-Node: Debug information");
  $("#info-modal-header-title").text("BT-Node: Debug information");
  let $body = $("#info-modal-body"),
    $modal = $("#info-modal"),
    $footer = $(".modal-footer");

  $body.empty();
  $modal.show();
  $footer.hide();

  if (info) {
    getInfoHTML(info, $body);
    getResultHTML(info, prefixes, $body);
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

function getResultHTML(info, prefixes, $body) {
  let result = info[1];
  let $result = $("<div>", {});
  $result.append($("<hr><h3>Node Result</h3>"));

  for (key in prefixes) {
    $result.append($("<p>", {
      class: "modal-prefix"
    }).append("<b>@prefix " + prefixes[key] + "</b> &lt;" + key + "&gt; ."));
  }

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
      let predicate = quad.predicate.value;
      let object = quad.object.value;
      let key;
      for (key in prefixes) {
        if (predicate.includes(key)) {
          predicate = predicate.replace(key, prefixes[key]);
        }
        if (object.includes(key)) {
          object = object.replace(key, prefixes[key]);
        }
      }
      subjects[quad.subject.value].push({
        predicate: predicate,
        object: object
      });
    }
  });

  console.log(subjects);

  let key;

  for (key in subjects) {
    if (key == "_super") {
      break;
    }
    let $input = $("<div class='agent-debug-statement'>", {});
    $input.append($("<div class='agent-debug-subject'>" + key + "</div>"));
    let values = subjects[key];
    if (Array.isArray(values)) {
      values.forEach(function (info) {
        let $childs = $("<div>", { class: 'agent-debug-pred-obj' });
        $childs.append($("<div class='agent-debug-predicate'>" + info.predicate + "</div>"));
        $childs.append($("<div class='agent-debug-object'>" + info.object + "</div>"));
        $input.append($childs);
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
