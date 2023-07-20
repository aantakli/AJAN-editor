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
import rdfGraph from "ajan-editor/helpers/RDFServices/RDF-graph";
import rdfManager from "ajan-editor/helpers/RDFServices/RDF-manager";
import agtActions from "ajan-editor/helpers/agents/actions";
import modals from "ajan-editor/helpers/ui/export-modals/info-modal";
import * as zip from "zip-js-webpack";

let $ = Ember.$;
let agents = null;
let behaviors = null;
let domain = null;
let definitions = null;
let info = {};
let elem = null;

export default {
  createExportModal: createExportModal
};

function createExportModal(agentsModel, behaviorsModel, domainModel, definitionsModel) {
  console.log("Ask for export AJAN-models");
  $("#modal-header-title").text("Export AJAN-models");
  let $body = $("#modal-body"),
    $modal = $("#universal-modal");
  $body.empty();
  $modal.show();

  agents = agentsModel;
  behaviors = behaviorsModel;
  domain = domainModel;
  definitions = definitionsModel;
  info = {};

  modals.getInfoHTML($body, info);
  modals.getOptionals($body, info);
  modals.getAgentModels($body, agents);
  modals.getBehaviorsModels($body, behaviors);
  modals.getDomain($body, domain);
  modals.getDefinitions($body, definitions);

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
  let domainRDF = getReposChecks(json, domain);
  let definitionsRDF = getReposChecks(json, definitions);
  downloadFile(json, agentsRDF, behaviorsRDF, domainRDF, definitionsRDF);
  removeModelsSectionListener();
  elem.removeEventListener("modal:confirm", onConfirm);
}

function getVals(json, model) {
  json["package"] = model.package.val();
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
  if (quads.length > 0) {
    return rdfGraph.toString(quads);
  }
  else {
    console.log("No agent models selected for exporting!");
    return "";
  }
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
      if (entry.initKnowledge) {
        rdfGraph.forEach(item => {
          if (item.graph.value == entry.initKnowledge) {
            quads = quads.concat(item);
          }
        });
      }
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
  if (output) {
    return "@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .\n" + output;
  }
  else {
    console.log("No behaviors selected for exporting!");
    return "";
  }
}

function getReposChecks(json, model) {
  let output = "";
  model.defs.forEach(function (entry) {
    if (entry.field.prop('checked')) {
      createObject(json, entry, "Repository");
      output += entry.data;
    }
  });
  return output;
}

function downloadFile(info, agents, behaviors, domain, definitions) {
  let infotxt = JSON.stringify(info, null, 2);
  console.log(infotxt);
  zipBlob(new Blob([infotxt]), new Blob([agents]), new Blob([behaviors]), new Blob([domain]), new Blob([definitions]), function (zip) {
    var a = window.document.createElement('a');
    a.href = URL.createObjectURL(new Blob([zip]));
    console.log(info.package);
    if (info.package == "")
      a.download = 'ajanPackage.ajan';
    else
      a.download = info.package + '.ajan';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  });
}

function zipBlob(info, agents, behaviors, domain, definitions, callback) {
  zip.createWriter(new zip.BlobWriter("application/zip"), function (zipWriter) {
    zipWriter.add('info.json', new zip.BlobReader(info), function () {
      addAgentsFile(zipWriter, agents, behaviors, domain, definitions, callback);
    });
  }, onerror);
}

function addAgentsFile(zipWriter, agents, behaviors, domain, definitions, callback) {
  if (agents.size > 0) {
    zipWriter.add('agents/agents.trig', new zip.BlobReader(agents), function () {
      addBehaviorsFile(zipWriter, behaviors, domain, definitions, callback);
    });
  }
  else {
    addBehaviorsFile(zipWriter, behaviors, domain, definitions, callback);
  }
}

function addBehaviorsFile(zipWriter, behaviors, domain, definitions, callback) {
  if (behaviors.size > 0) {
    zipWriter.add('behaviors/behaviors.ttl', new zip.BlobReader(behaviors), function () {
      addDomainFile(zipWriter, domain, definitions, callback);
    });
  }
  else {
    addDomainFile(zipWriter, domain, definitions, callback);
  }
}

function addDomainFile(zipWriter, domain, definitions, callback) {
  if (domain.size > 0) {
    zipWriter.add('behaviors/domain.ttl', new zip.BlobReader(domain), function () {
      addDefinitionsFile(zipWriter, definitions, callback);
    });
  }
  else {
    addDefinitionsFile(zipWriter, definitions, callback);
  }
}

function addDefinitionsFile(zipWriter, definitions, callback) {
  if (definitions.size > 0) {
    zipWriter.add('definitions/editor_data.trig', new zip.BlobReader(definitions), function () {
      zipWriter.close(callback);
    });
  }
  else {
    zipWriter.close(callback);
  }
}
