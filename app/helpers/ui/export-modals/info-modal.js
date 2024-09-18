/*
 * Created on Tue Nov 10 2020
 *
 * The MIT License (MIT)
 * Copyright (c) 2020 André Antakli (German Research Center for Artificial Intelligence, DFKI).
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

import utility from "ajan-editor/helpers/RDFServices/utility";

export default {
  getInfoHTML: getInfoHTML,
  getOptionals: getOptionals,
  getAgentModels: getAgentModels,
  getBehaviorModels: getBehaviorModels,
  getActionModels: getActionModels,
  getDomain: getDomain,
  getDefinitions: getDefinitions
};

function getInfoHTML($body, info) {
  let $header = $("<h2>Package Information</h2>", {});
  let $info = $("<div>", { class: "modal-models-overview active" });
  info.package = createInputField($info, "Package Name");
  info.author = createInputField($info, "Author");
  info.vendor = createInputField($info, "Vendor");
  info.domain = createInputField($info, "Domain");
  info.version = createInputField($info, "Version");
  info.comment = createInputField($info, "Comment");

  let $selectionfield = $("<div>", {style: "display: flex; align-items: baseline;"});
  $info.append($selectionfield);
  let $selection = $("<p>De/-Select All</p>");
  $selectionfield.append($selection);
  let $selectAll = $("<button style='margin-left: 5px' class='selection-toggle ui yellow icon button' data-toggleTarget='all' data-toggle='true'><i class='square outline icon no-side-margins'></i></button>")
  $selectionfield.append($selectAll);
  $selectAll.on('click', {event}, selectAll);

  let $infoDiv = createModelsDiv($header, $info);
  // Append to modal body
  $body.append($infoDiv);
}

function createHeader(text, active = "", selection = false) {
  let $header = $("<div>", { class: "modal-models-header title " + active })
  $header.append($("<i>", { class: "dropdown icon" }))
  $header.append($("<span>", {}).text(text));
  if (selection) {
    let $selectAll = $("<button class='selection-toggle add-optional ui yellow icon button' data-toggle='true'></button>")
      .append($("<i class='square outline icon no-side-margins'></i>"));
    $header.append($selectAll);
    $selectAll.on('click', {event}, selectAll);
  }
  return $header;
}

function createModelsDiv($header, $info) {
  let $infoDiv = $("<div>", {
    class: "modal-body-div accordion ui"
  }).append($header, $info);
  return $infoDiv;
}

// ---------------------------------
// Optionals
// ---------------------------------

function getOptionals($body, info) {
  let $header = createHeader("Add Optionals");
  let $add = $("<button>", { class: "add-optional ui yellow icon button  " })
    .append($("<i class='add icon no-side-margins'></i>"));
  $header.append($add);
  let $info = $("<div>", { class: "modal-models-overview" });
  info.optionals = [];
  $add.on('click', { optional_info: info, optional_root: $info }, addOptional);
  let $infoDiv = createModelsDiv($header, $info);
  // Append to modal body
  $body.append($infoDiv);
}

function addOptional(event) {
  let info = event.data.optional_info;
  let $div = event.data.optional_root;
  let $optional = $("<div>", { class: "modal-models-optional" });
  let fields = { "id": utility.generateUUID(), "name": createInputField($optional, "Name"), "value": createInputField($optional, "Value") };
  //remove Button
  let $remove = $("<button>", { class: "remove-optional ui red icon button  " })
    .append($("<i class='remove icon no-side-margins'></i>"));
  $remove.on('click', { optional_info: info, optional_fields: fields }, removeOptional);
  $optional.append($remove);

  info.optionals.push(fields);
  $div.append($optional);
  if (!$div.hasClass("active")) {
    $div.addClass("active");
    $div.prev().addClass("active");
  }
}

function removeOptional(event) {
  let info = event.data.optional_info;
  let fields = event.data.optional_fields;
  let $target = $(event.target);
  $target.closest(".modal-models-optional").remove();
  let index = info.optionals.indexOf(fields);
  info.optionals.splice(index, 1);
}

// ---------------------------------
// Agent Models
// ---------------------------------

function getAgentModels($body, model) {
  let $header = createHeader("Add Agent Models", "", true);
  let $info = $("<div>", { class: "modal-models-overview" });
  createTemplates($info, model);
  createBehaviors($info, model);
  createEndpoints($info, model);
  createEvents($info, model);
  createGoals($info, model);

  let $infoDiv = createModelsDiv($header, $info);
  // Append to modal body
  $body.append($infoDiv);
}

function createTemplates($info, model) {
  $info.append($("<h3>Agent Templates</h3>"));
  model.defs.templates.forEach(function (entry) {
    entry.field = createSelectField($info, entry);
  });
}

function createBehaviors($info, model) {
  $info.append($("<h3>Behaviors</h3>"));
  model.defs.behaviors.regular.forEach(function (entry) {
    entry.field = createSelectField($info, entry);
  });
  $info.append($("<h4>Initial Behaviors</h4>"));
  model.defs.behaviors.initial.forEach(function (entry) {
    entry.field = createSelectField($info, entry);
  });
  $info.append($("<h4>Final Behaviors</h4>"));
  model.defs.behaviors.final.forEach(function (entry) {
    entry.field = createSelectField($info, entry);
  });
}

function createEndpoints($info, model) {
  $info.append($("<h3>Endpoints</h3>"));
  model.defs.endpoints.forEach(function (entry) {
    entry.field = createSelectField($info, entry);
  });
}

function createEvents($info, model) {
  $info.append($("<h3>Events</h3>"));
  model.defs.events.forEach(function (entry) {
    entry.field = createSelectField($info, entry);
  });
}

function createGoals($info, model) {
  $info.append($("<h3>Goals</h3>"));
  model.defs.goals.forEach(function (entry) {
    entry.field = createSelectField($info, entry);
  });
}

function createInputField($info, name) {
  let $field = $("<p>", { class: "modal-p" });
  let $title = $("<i>" + name + "</i>");
  let $input = $("<input>", {
    class: "modal-input",
    id: name + "-input",
    placeholder: name
  });
  $field.append($input, $title);
  $info.append($field);
  return $input;
}

function createSelectField($info, object) {
  if (object.id) {
    let name = object.label;
    if (!name)
      name = object.name;
    let $field = $("<p>", { class: "modal-p" });
    let $title = $("<i>" + name + "</i>");
    let $input = $("<input>", {
      type: "checkbox",
      value: object.uri,
      name: name,
      class: "modal-checkbox",
    });
    $field.append($input, $title);
    $info.append($field);
    return $input;
  }
  return null;
}

// ---------------------------------
// Behavior Models
// ---------------------------------

function getBehaviorModels($body, model) {
  let $header = createHeader("Add Behavior Models", "", true);
  let $info = $("<div>", { class: "modal-models-overview" });
  createBTs($info, model);

  let $infoDiv = createModelsDiv($header, $info);
  // Append to modal body
  $body.append($infoDiv);
}

function createBTs($info, model) {
  $info.append($("<h3>Behavior Trees</h3>"));
  model.defs.forEach(function (entry) {
    entry.field = createSelectField($info, entry);
  });
}

// ---------------------------------
// Action Models
// ---------------------------------

function getActionModels($body, model) {
  let $header = createHeader("Add Action Models", "", true);
  let $info = $("<div>", { class: "modal-models-overview" });
  createActions($info, model);
  let $infoDiv = createModelsDiv($header, $info);
  // Append to modal body
  $body.append($infoDiv);
}

function createActions($info, model) {
  $info.append($("<h3>Service Actions</h3>"));
  model.defs.services.forEach(function (entry) {
    entry.field = createSelectField($info, entry);
  });
}

// ---------------------------------
// Domain
// ---------------------------------

function getDomain($body, model) {
  let $header = createHeader("Add Domain information", "", true);
  let $info = $("<div>", { class: "modal-models-overview" });
  createDomains($info, model);
  let $infoDiv = createModelsDiv($header, $info);
  // Append to modal body
  $body.append($infoDiv);
}

function createDomains($info, model) {
  $info.append($("<h3>Domain Information</h3>"));
  model.defs.forEach(function (entry) {
    entry.field = createSelectField($info, entry);
  });
}

// ---------------------------------
// Definitions
// ---------------------------------

function getDefinitions($body, model) {
  let $header = createHeader("Add Editor Definitions", "", true);
  let $info = $("<div>", { class: "modal-models-overview" });
  createDefinitions($info, model);
  let $infoDiv = createModelsDiv($header, $info);
  // Append to modal body
  $body.append($infoDiv);
}

function createDefinitions($info, model) {
  $info.append($("<h3>Editor Definitions</h3>"));
  model.defs.forEach(function (entry) {
    entry.field = createSelectField($info, entry);
  });
}

// ---------------------------------
// Bulk Selection
// ---------------------------------

function selectAll(event){
  let target = event.currentTarget;
  let value = target.attributes["data-toggle"].value;
  let modalCheckboxs;
  if(target.attributes["data-toggletarget"]){
    modalCheckboxs = document.getElementsByClassName("modal-checkbox");
    let toggleButtons = document.getElementsByClassName("selection-toggle");
    for (let i = 0; i < toggleButtons.length; i++) {
      let toggleButton = toggleButtons[i];
      toggleButton.attributes["data-toggle"].value = value === "true" ? "false" : "true";
      toggleButton.innerHTML = value === "false" ? "<i class='square outline icon no-side-margins'></i>" : "<i class='check square outline icon no-side-margins'></i>";
    }
  } else {
    modalCheckboxs = target.parentElement.parentElement.getElementsByClassName("modal-checkbox");
  }
  for (let i = 0; i < modalCheckboxs.length; i++) {
    modalCheckboxs[i].checked = value.toLowerCase() === "true";
  }
  target.innerHTML = value === "false" ? "<i class='square outline icon no-side-margins'></i>" : "<i class='check square outline icon no-side-margins'></i>";
  target.attributes["data-toggle"].value = value === "true" ? "false" : "true";
}
