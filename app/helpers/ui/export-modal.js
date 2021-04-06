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
import rdfManager from "ajan-editor/helpers/RDFServices/RDF-manager";
import agtActions from "ajan-editor/helpers/agents/actions";
import modals from "ajan-editor/helpers/ui/export-modals/info-modal";
import * as zip from "zip-js-webpack";

let $ = Ember.$;
let agents = null;
let info = {};
let behaviors = null;
let elem = null;

export default {
  createExportModal: createExportModal
};

function createExportModal(agentsModel, behaviorsModel) {
  console.log("Ask for export AJAN-models");
  $("#modal-header-title").text("Export AJAN-models");
  let $body = $("#modal-body"),
    $modal = $("#universal-modal");
  $body.empty();
  $modal.show();

  agents = agentsModel;
  behaviors = behaviorsModel;
  info = {};

  modals.getInfoHTML($body, info);
  modals.getOptionals($body, info);
  modals.getAgentModels($body, agents);
  modals.getBehaviorsModels($body, behaviors);

  addModelsSectionListener();

  // Listen for the confirm event
  elem = document.getElementById("universal-modal");
  elem.addEventListener("modal:confirm", onConfirm);
  elem.addEventListener("modal:cancel", onCancel);
}

function addModelsSectionListener() {
  let $header = $("div.modal-models-header");
  for (let item of $header) {
    item.addEventListener("click", toggleSection);
  }
}

function removeModelsSectionListener() {
  let $header = $("div.modal-models-header");
  for (let item of $header) {
    item.removeEventListener("click", toggleSection);
  }
}

function toggleSection(event) {
  let $target = $(event.target);
  if ($target.is("span")) $target = $target.parent();
  $target.toggleClass("active");
  $target.next().toggleClass("active");
}

// --------------------
// onConfirm stuff
// --------------------

function onCancel() {
  removeModelsSectionListener();
  elem.removeEventListener("modal:confirm", onConfirm);
  elem.removeEventListener("modal:cancel", onCancel);
}

function onConfirm() {
  let json = {};
  getVals(json, info);
  getOptionals(json, info);
  json["contains"] = new Array();
  let agentsRDF = getAgentChecks(json, agents);
  let behaviorsRDF = getBehaviorChecks(json, behaviors);
  let infotxt = JSON.stringify(json, null, 2);
  console.log(infotxt);
  downloadFile(infotxt, agentsRDF, behaviorsRDF);
  removeModelsSectionListener();
  elem.removeEventListener("modal:confirm", onConfirm);
}

function getVals(json, model) {
  json["author"] = model.author.val();
  json["vendor"] = model.vendor.val();
  json["vendorDomain"] = model.domain.val();
  json["date"] = model.author.val();
  json["version"] = model.version.val();
  json["comment"] = model.comment.val();
}

function getOptionals(json, model) {
  json["optionals"] = [];
  model.optionals.forEach(function (data) {
    let optional = {};
    optional["name"] = data.name.val();
    optional["value"] = data.value.val();
    json["optionals"].push(optional);
  });
}

function getAgentChecks(json, model) {
  rdfGraph.reset();
  rdfGraph.set(model.rdf);
  let quads = [];
  quads = setTemplates(json, model, quads);
  quads = setBehaviors(json, model, quads);
  quads = setEndpoints(json, model, quads);
  quads = setEvents(json, model, quads);
  quads = setGoals(json, model, quads);
  return rdfGraph.toString(quads) + ".";
}

function getBehaviorChecks(json, model) {
  rdfGraph.reset();
  rdfGraph.set(model.rdf);
  return setBTs(json, model);
}

function setTemplates(json, model, quads) {
  model.defs.templates.forEach(function (entry) {
    if (entry.field.prop('checked')) {
      createObject(json, entry, "Agent");
      quads = quads.concat(rdfGraph.getAllQuads(entry.uri));
    }
  });
  return quads;
}

function setBehaviors(json, model, quads) {
  model.defs.behaviors.regular.forEach(function (entry) {
    if (entry.field.prop('checked')) {
      createObject(json, entry, "Behavior");
      quads = quads.concat(rdfGraph.getAllQuads(entry.uri));
    }
  });
  model.defs.behaviors.initial.forEach(function (entry) {
    if (entry.id)
      if (entry.field.prop('checked')) {
        createObject(json, entry, "Initial Behavior");
        quads = quads.concat(rdfGraph.getAllQuads(entry.uri));
      }
  });
  model.defs.behaviors.final.forEach(function (entry) {
    if (entry.id)
      if (entry.field.prop('checked')) {
        createObject(json, entry, "Final Behavior");
        quads = quads.concat(rdfGraph.getAllQuads(entry.uri));
      }
  });
  return quads;
}

function setEndpoints(json, model, quads) {
  model.defs.endpoints.forEach(function (entry) {
    if (entry.field.prop('checked')) {
      createObject(json, entry, "Endpoint");
      quads = quads.concat(rdfGraph.getAllQuads(entry.uri));
    }
  });
  return quads;
}

function setEvents(json, model, quads) {
  model.defs.events.forEach(function (entry) {
    if (entry.field.prop('checked')) {
      createObject(json, entry, "Event");
      quads = quads.concat(rdfGraph.getAllQuads(entry.uri));
    }
  });
  return quads;
}

function setGoals(json, model, quads) {
  model.defs.goals.forEach(function (entry) {
    if (entry.field.prop('checked')) {
      createObject(json, entry, "Goal");
      quads = quads.concat(agtActions.exportGoal(entry.uri));
    }
  });
  return quads;
}

function createObject(json, entry, type) {
  let obj = {};
  let name = entry.label;
  if (!name)
    name = entry.name;
  obj["type"] = type;
  obj["name"] = name;
  obj["uri"] = entry.uri;
  json["contains"].push(obj);
}

function setBTs(json, model) {
  let output = "";
  model.defs.forEach(function (entry) {
    if (entry.field.prop('checked')) {
      createObject(json, entry, "BT");
      output += rdfManager.exportBT(entry.uri, model.defs.filter(item => item.uri !== entry.uri));
    }
  });
  return "@prefix xsd: <http://www.w3.org/2001/XMLSchema#> . " + output;
}

function downloadFile(info, agents, behaviors) {
  zipBlob(new Blob([info]), new Blob([agents]), new Blob([behaviors]), function (zip) {
    var a = window.document.createElement('a');
    a.href = URL.createObjectURL(new Blob([zip]));
    a.download = 'ajanPackage.zip';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  });
}

function zipBlob(info, agents, behaviors, callback) {
  zip.createWriter(new zip.BlobWriter("application/zip"), function (zipWriter) {
    zipWriter.add('info.json', new zip.BlobReader(info), function () {
      zipWriter.add('agents/agents.ttl', new zip.BlobReader(agents), function () {
        zipWriter.add('behaviors/behaviors.ttl', new zip.BlobReader(behaviors), function () {
          zipWriter.close(callback);
        });
      });
    });
  }, onerror);
}
