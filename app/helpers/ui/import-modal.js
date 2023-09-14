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

import { AGENTS } from "ajan-editor/helpers/RDFServices/vocabulary";

let callback = null;
let elem = null;

export default {
  createImportModal: createImportModal
};

function createImportModal(matches, callbackFunct, info) {
  callback = callbackFunct;
  console.log("Ask for import AJAN-models");
  $("#modal-header-title").text("Import AJAN-models");
  let $matchesDiv = $("<div>", {
    class: "modal-body-div"
  });
  let $body = $("#modal-body"),
    $modal = $("#universal-modal");
  $body.empty();
  $modal.show();

  if (info) {
    console.log(info);
    getInfoHTML(info, matches, $body, $matchesDiv);
  }
  if (matches) {
    getMatchesHTML(matches, $matchesDiv);
    $body.append($matchesDiv);
  }

  // Listen for the confirm event
  elem = document.getElementById("universal-modal");
  elem.addEventListener("modal:confirm", onConfirm);
  elem.addEventListener("modal:cancel", onCancel);
}

function onConfirm() {
  callback();
  elem.removeEventListener("modal:confirm", onConfirm);
}

function onCancel() {
  elem.removeEventListener("modal:confirm", onConfirm);
  elem.removeEventListener("modal:cancel", onCancel);
}

function getInfoHTML(info, matches, $body, $matchesDiv) {
  let $info = $("<div>", {});
  $info.append($("<h2>Package Information</h2>"));
  if (info.author) {
    $info.append($("<p>", {
      class: "modal-p"
    }).append("<b>Author:</b> " + info.author));
  }
  if (info.vendor) {
    $info.append($("<p>", {
      class: "modal-p"
    }).append("<b>Vendor:</b> " + info.vendor));
  }
  if (info.vendorDomain) {
    $info.append($("<p>", {
      class: "modal-p"
    }).append("<b>Domain:</b> " + info.vendorDomain));
  }
  if (info.date) {
    $info.append($("<p>", {
      class: "modal-p"
    }).append("<b>Date:</b> " + info.date));
  }
  if (info.version) {
    $info.append($("<p>", {
      class: "modal-p"
    }).append("<b>Version:</b> " + info.version));
  }
  if (info.comment) {
    $info.append($("<p>", {
      class: "modal-p"
    }).append("<b>Comment:</b> " + info.comment));
  }
  if (info.contains) {
    setContainsHTML(info.contains, matches, $info, $matchesDiv);
  }
  if (info.optionals) {
    setOptionalsHTML(info.optionals, $info);
  }
  let $infoDiv = $("<div>", {
    class: "modal-body-div"
  }).append($info);
  // Append to modal body
  $body.append($infoDiv);
}

function setContainsHTML(contains, matches, $info, $matchesDiv) {
  if (contains.length > 0) {
    let $contains = $("<div>", {});
    $contains.append($("<p><b>Contains/Import:</b>"));
    let $list = $("<ul style='padding-left:0px'>", {});
    contains.forEach((item) => {
      let $input = $("<input style='width:3%' type='checkbox' checked id='" + item.uri + "'>");
      $input.click(function () {
        setImport(matches, item, $input.is(":checked"));
        $matchesDiv.empty();
        getMatchesHTML(matches, $matchesDiv);
      });
      $list.append($("<li style='list-style-type:none'>", {
        class: "modal-p"
      }).append($input).append("<i>" + item.type + "</i> | <b>" + item.name + "</b> | " + item.uri));
    });
    $info.append($contains.append($list));
  }
}

function setImport(matches, item, checked) {
  if (matches.agents) {
    let agtMatch = matches.agents.find(x => x.uri === item.uri);
    if (agtMatch) agtMatch.import = checked;
  }
  if (matches.behaviors) {
    let btMatch = matches.behaviors.find(x => x.uri === item.uri);
    if (btMatch) btMatch.import = checked;
  }
  if (matches.repositories) {
    let repoMatch = matches.repositories.find(x => x.uri === item.uri);
    if (repoMatch) repoMatch.import = checked;
  }
}

function setOptionalsHTML(optionals, $info) {
  if (optionals && optionals.length > 0) {
    let $optionals = $("<div>", {});
    $optionals.append($("<p><b>Further Information:</b>"));
    let $list = $("<ul>", {});
    optionals.forEach((item) => {
      $list.append($("<li>", {
        class: "modal-p"
      }).append("<b>" + item.name + "</b> | " + item.value));
    });
    $info.append($optionals.append($list));
  }
}

function getMatchesHTML(matches, $matchesDiv) {
  let $matches = $("<div>", {});
  $matches.append($("<hr><h3>Following matches will be overwritten!</h3>"));
  if (Array.isArray(matches))
    getTypeMatches(matches, $matches);
  else {
    if (matches.agents && matches.agents.length > 0)
      getTypeMatches(matches.agents, $matches);
    if (matches.behaviors && matches.behaviors.length > 0)
      getTypeMatches(matches.behaviors, $matches);
    if (matches.repositories && matches.repositories.length > 0)
      getTypeMatches(matches.repositories, $matches);
  }
  $matchesDiv.append($matches);
}

function getTypeMatches(matches, $matches) {
  matches.forEach((item) => {
    console.log(item);
    if (item != undefined && item.match && item.import) {
      if (item.label != undefined) {
        $matches.append($("<p>", {
          style: 'color: #c92306',
          class: "modal-p"
        }).append("<i>" + getTypeName(item.type) + "</i> | <b>" + item.label + "</b> | " + item.uri));
      } else {
        $matches.append($("<p>", {
          style: 'color: #c92306',
          class: "modal-p"
        }).append("<i>BT</i> | <b>" + item.name + "</b> | " + item.uri));
      }
    }
  });
}

function getTypeName(type) {
  switch (type) {
    case AGENTS.Repository: return "Repository";
    case AGENTS.AgentTemplate: return "Agent";
    case AGENTS.Behavior: return "Behavior";
    case AGENTS.InitialBehavior: return "InitialBehavior";
    case AGENTS.FinalBehavior: return "FinalBehavior";
    case AGENTS.Endpoint: return "Endpoint";
    case AGENTS.Event: return "Event";
    case AGENTS.Goal: return "Goal";
    default: return type;
  }
}
