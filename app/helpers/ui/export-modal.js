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
import rdfGraph from "ajan-editor/helpers/RDFServices/RDF-graph";
import agtActions from "ajan-editor/helpers/agents/actions";
import * as zip from "zip-js-webpack";

let $ = Ember.$;

export default {
  createExportModal: createExportModal
};

function createExportModal(agents, behaviors) {
  console.log("Ask for export AJAN-models");
  $("#modal-header-title").text("Export AJAN-models");
  let $body = $("#modal-body"),
    $modal = $("#universal-modal");
  $body.empty();
  $modal.show();

  console.log(agents);
  console.log(behaviors);

  let info = {};

  getInfoHTML($body, info);
  getModels($body, agents);

  // Listen for the confirm event
  let elem = document.getElementById("universal-modal");
  elem.addEventListener("modal:confirm", () => {
    onConfirm(info, agents);
  });
}

function getInfoHTML($body, info) {
  let $info = $("<div>", {});
  $info.append($("<h2>Package Information</h2>"));

  info.author = createInputField($info, "Author");
  info.vendor = createInputField($info, "Vendor");
  info.domain = createInputField($info, "Domain");
  info.version = createInputField($info, "Version");
  info.comment = createInputField($info, "Comment");

  let $infoDiv = $("<div>", {
    class: "modal-body-div"
  }).append($info);
  // Append to modal body
  $body.append($infoDiv);
}

function getModels($body, model) {
  let $info = $("<div>", {});
  $info.append($("<h2>Add Models</h2>"));
  createTemplates($info, model);
  createBehaviors($info, model);
  createEndpoints($info, model);
  createEvents($info, model);
  createGoals($info, model);

  let $infoDiv = $("<div>", {
    class: "modal-body-div"
  }).append($info);
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
  model.defs.behaviors.initial.forEach(function (entry) {
    entry.field = createSelectField($info, entry);
  });
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
    let $field = $("<p>", { class: "modal-p" });
    let $title = $("<i>" + object.label + "</i>");
    let $input = $("<input>", {
      type: "checkbox",
      value: object.uri,
      name: object.label,
      class: "modal-checkbox",
    });
    $field.append($input, $title);
    $info.append($field);
    return $input;
  }
  return null;
}

function onConfirm(info, model) {
  let json = {};
  console.log(info);
  console.log(model);
  getVals(json, info);
  let agentsRDF = getChecks(json, model);
  let infotxt = JSON.stringify(json, null, 2);
  console.log(infotxt);
  downloadFile(infotxt, agentsRDF + ".");
}

function getVals(json, model) {
  json["author"] = model.author.val();
  json["vendor"] = model.vendor.val();
  json["vendorDomain"] = model.domain.val();
  json["date"] = model.author.val();
  json["version"] = model.version.val();
  json["comment"] = model.comment.val();
}

function getChecks(json, model) {
  rdfGraph.reset();
  rdfGraph.set(model.rdf);
  json["contains"] = new Array();
  setTemplates(json, model);
  setBehaviors(json, model);
  setEndpoints(json, model);
  setEvents(json, model);
  setGoals(json, model);
  return rdfGraph.toString(model.rdf);
}

function setTemplates(json, model) {
  model.defs.templates.forEach(function (entry) {
    if (entry.field.prop('checked')) {
      createObject(json, entry, "Agent");
    } else {
      agtActions.deleteAgent(entry);
    }
  });
}

function setBehaviors(json, model) {
  model.defs.behaviors.regular.forEach(function (entry) {
    if (entry.field.prop('checked')) {
      createObject(json, entry, "Behavior");
    } else {
      agtActions.deleteBehavior(entry);
    }
  });
  model.defs.behaviors.initial.forEach(function (entry) {
    if (entry.id)
      if (entry.field.prop('checked')) {
        createObject(json, entry, "Initial Behavior");
      } else {
        agtActions.deleteBehavior(entry);
      }
  });
  model.defs.behaviors.final.forEach(function (entry) {
    if (entry.id)
      if (entry.field.prop('checked')) {
        createObject(json, entry, "Final Behavior");
      } else {
        agtActions.deleteBehavior(entry);
      }
  });
}

function setEndpoints(json, model) {
  model.defs.endpoints.forEach(function (entry) {
    if (entry.field.prop('checked')) {
      createObject(json, entry, "Endpoint");
    } else {
      agtActions.deleteEndpoint(entry);
    }
  });
}

function setEvents(json, model) {
  model.defs.events.forEach(function (entry) {
    if (entry.field.prop('checked')) {
      createObject(json, entry, "Event");
    } else {
      agtActions.deleteEvent(entry);
    }
  });
}

function setGoals(json, model) {
  model.defs.goals.forEach(function (entry) {
    if (entry.field.prop('checked')) {
      createObject(json, entry, "Goal");
    } else {
      agtActions.deleteGoal(entry);
    }
  });
}

function createObject(json, entry, type) {
  let obj = {};
  obj["type"] = type;
  obj["name"] = entry.label;
  obj["uri"] = entry.uri;
  json["contains"].push(obj);
}

function downloadFile(info, agents) {
  zipBlob(new Blob([info]), new Blob([agents]), function (zip) {
    var a = window.document.createElement('a');
    a.href = URL.createObjectURL(new Blob([zip]));
    a.download = 'ajanPackage.zip';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  });
}

function zipBlob(info, agents, callback) {
  zip.createWriter(new zip.BlobWriter("application/zip"), function (zipWriter) {
    zipWriter.add('info.json', new zip.BlobReader(info), function () {
      zipWriter.add('agents/agents.ttl', new zip.BlobReader(agents), function () {
        zipWriter.close(callback);
      });
    });
  }, onerror);
}
