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

export default {
  createImportModal: createImportModal
};

function createImportModal(matches, onConfirm, info) {
  console.log("Ask for import AJAN-models");
  $("#modal-header-title").text("Import AJAN-models");
  let $body = $("#modal-body"),
    $modal = $("#universal-modal");
  $body.empty();
  $modal.show();

  if (info) {
    getInfoHTML(info, $body);
  }
  if (matches.length > 0) {
    getMatchesHTML(matches, $body);
  }

  // Listen for the confirm event
  let elem = document.getElementById("universal-modal");
  elem.addEventListener("modal:confirm", () => {
    onConfirm();
  });
}

function getInfoHTML(info, $body) {
  console.log(info);

  let $info = $("<div>", {});
  $info.append($("<h2>Package Information</h2>"));
  $info.append($("<p>", {
    class: "modal-p"
  }).append("<b>Author:</b> " + info.author));
  $info.append($("<p>", {
    class: "modal-p"
  }).append("<b>Organization:</b> " + info.organization));
  $info.append($("<p>", {
    class: "modal-p"
  }).append("<b>Date:</b> " + info.date));
  $info.append($("<p>", {
    class: "modal-p"
  }).append("<b>Version:</b> " + info.version));
  $info.append($("<p>", {
    class: "modal-p"
  }).append("<b>Comment:</b> " + info.comment));

  setContainsHTML(info.contains, $info);
  setOptionalsHTML(info.optionals, $info);

  let $infoDiv = $("<div>", {
    class: "modal-body-div"
  }).append($info);
  // Append to modal body
  $body.append($infoDiv);
}

function setContainsHTML(contains, $info) {
  if (contains.length > 0) {
    let $contains = $("<div>", {});
    $contains.append($("<p><b>Contains:</b>"));
    let $list = $("<ul>", {});
    contains.forEach((item) => {
      console.log(item);
      $list.append($("<li>", {
        class: "modal-p"
      }).append("<i>" + item.type + "</i> | <b>" + item.name + "</b> | " + item.uri));
    });
    $info.append($contains.append($list));
  }
}

function setOptionalsHTML(optionals, $info) {
  console.log(optionals);
  if (optionals.length > 0) {
    let $optionals = $("<div>", {});
    $optionals.append($("<p><b>Further Information:</b>"));
    let $list = $("<ul>", {});
    optionals.forEach((item) => {
      console.log(item);
      $list.append($("<li>", {
        class: "modal-p"
      }).append("<b>" + item.name + "</b> | " + item.value));
    });
    $info.append($optionals.append($list));
  }
}

function getMatchesHTML(matches, $body) {
  let $matches = $("<div>", {});
  $matches.append($("<hr><h3>Following matches will be overwritten!</h3>"));
  matches.forEach((item) => {
    console.log(item);
    if (item != undefined) {
      $matches.append($("<p>", {
        style: 'color: #c92306',
        class: "modal-p"
      }).append("<i>" + item.name + "</i> | <b>" + item.label + "</b> | " + item.uri));
    }
  });
  let $matchesDiv = $("<div>", {
    class: "modal-body-div"
  }).append($matches);
  // Append to modal body
  $body.append($matchesDiv);
}
