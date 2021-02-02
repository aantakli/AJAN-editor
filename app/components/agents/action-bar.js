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

import Component from "@ember/component";
import globals from "ajan-editor/helpers/global-parameters";
import { sendFile, deleteRepo } from "ajan-editor/helpers/RDFServices/ajax/query-rdf4j";
import rdfGraph from "ajan-editor/helpers/RDFServices/RDF-graph";
import queries from "ajan-editor/helpers/RDFServices/queries";
import { AGENTS, RDF } from "ajan-editor/helpers/RDFServices/vocabulary";
import rdf from "npm:rdf-ext";
import N3 from "npm:rdf-parser-n3";
import stringToStream from "npm:string-to-stream";
import actions from "ajan-editor/helpers/agents/actions";

let $ = Ember.$;
let repo = undefined;
let that = undefined;

export default Component.extend({
  dataBus: Ember.inject.service('data-bus'),
  fileName: "agents.ttl",
  fileContent: "",
  agentDefs: [],

  init() {
    this._super(...arguments);
    that = this;
    repo =
      (localStorage.currentStore ||
        "http://localhost:8090/rdf4j/repositories") +
      globals.agentsRepository;

    this.get('dataBus').on('updatedAG', function () {
      $.ajax({
        url: repo,
        type: "POST",
        contentType: "application/sparql-query; charset=utf-8",
        headers: {
          Accept: "text/turtle; charset=utf-8"
        },
        data: queries.constructGraph
      }).then(function (data) {
        that.set("fileContent", URL.createObjectURL(new Blob([data])));
      });
    });

    this.get('dataBus').on('updateAgentDefs', function (defs) {
      that.set("agentDefs", defs);
    });
  },

  actions: {
    loadRepo() {
      console.log(event.target.files);
      loadRepo(event);
    },

    loadFile() {
      loadFile(event)
    }
  }
});

function loadRepo(event) {
  let file = event.target.files[0];
  console.log("File: " + file.name);
  var reader = new FileReader();
  reader.onload = function () {
    let content = reader.result;
    deleteRepo(repo, queries.deleteAll())
      .then(sendFile(repo, content))
      .then(window.location.reload());
  };
  reader.readAsText(file);
}

function loadFile(event) {
  let file = event.target.files[0];
  console.log("File: " + file.name);
  var reader = new FileReader();
  reader.onload = function () {
    let content = reader.result;
    readInput(content);
  };
  reader.readAsText(file);
}

function readInput(content) {
  let parser = new N3({ factory: rdf });
  let quadStream = parser.import(stringToStream(content));
  let importFile = {
    agents: [],
    behaviors: [],
    endpoints: [],
    events: [],
    goals: []
  };
  rdf.dataset().import(quadStream).then((dataset) => {
    console.log(dataset);
    let quads = [];
    dataset.forEach((quad) => {
      quads.push(quad);
      if (quad.predicate.value === RDF.type && quad.object.value === AGENTS.AgentTemplate) {
        importFile.agents.push(quad.subject.value);
      } else if (quad.predicate.value === RDF.type && quad.object.value === AGENTS.InitialBehavior) {
        importFile.behaviors.push(quad.subject.value);
      } else if (quad.predicate.value === RDF.type && quad.object.value === AGENTS.FinalBehavior) {
        importFile.behaviors.push(quad.subject.value);
      } else if (quad.predicate.value === RDF.type && quad.object.value === AGENTS.Behavior) {
        importFile.behaviors.push(quad.subject.value);
      } else if (quad.predicate.value === RDF.type && quad.object.value === AGENTS.Endpoint) {
        importFile.endpoints.push(quad.subject.value);
      } else if (quad.predicate.value === RDF.type && quad.object.value === AGENTS.Event) {
        importFile.events.push(quad.subject.value);
      } else if (quad.predicate.value === RDF.type && quad.object.value === AGENTS.Goal) {
        importFile.goals.push(quad.subject.value);
      }
    });
    updateType(content, quads, importFile);
  });
}

function updateType(content, quads, importFile) {
  console.log(that.get("agentDefs"));
  let overrides = getOverrides(that.get("agentDefs.templates"), importFile.agents);
  overrides = overrides.concat(getOverrides(that.get("agentDefs.behaviors.final"), importFile.behaviors));
  overrides = overrides.concat(getOverrides(that.get("agentDefs.behaviors.initial"), importFile.behaviors));
  overrides = overrides.concat(getOverrides(that.get("agentDefs.behaviors.regular"), importFile.behaviors));
  overrides = overrides.concat(getOverrides(that.get("agentDefs.endpoints"), importFile.endpoints));
  overrides = overrides.concat(getOverrides(that.get("agentDefs.events"), importFile.events));
  overrides = overrides.concat(getOverrides(that.get("agentDefs.goals"), importFile.goals));
  if (overrides.length > 0)
    createModal(overrides, quads);
  else {
    sendFile(repo, content)
      .then(window.location.reload());
  }
}

function getOverrides(defs, imports) {
  let overrides = [];
  console.log(imports);
  if (imports) {
    defs.forEach((data) => {
      imports.forEach((item) => {
        console.log(data.uri);
        console.log(item);
        if (data.uri === item) {
          console.log(data);
          overrides.push(data);
        }
      });
    });
  }
  return overrides;
}

function createModal(overrides, quads) {
  console.log("Ask for overriding definitions");
  $("#modal-header-title").text("Override");
  let $body = $("#modal-body"),
    $modal = $("#universal-modal");
  $body.empty();
  $modal.show();

  // Label
  let $labelTitle = $("<div>", {});
  overrides.forEach((item) => {
    console.log(item);
    $labelTitle.append($("<p>", {
      class: "modal-p"
    }).append("<i>" + item.type + "<i> | <b>" + item.label + "</b> | " + item.uri));
  });
  let $labelDiv = $("<div>", {
    class: "modal-body-div"
  }).append($labelTitle);

  // Append to modal body
  $body.append($labelDiv);

  // Listen for the confirm event
  let elem = document.getElementById("universal-modal");
  elem.addEventListener("modal:confirm", () => {
    overrides.forEach((data) => {
      if (data.type === AGENTS.AgentTemplate)
        actions.deleteAgent(AgentTemplate);
      else if (data.type === AGENTS.InitialBehavior)
        actions.deleteBehavior(data);
      else if (data.type === AGENTS.FinalBehavior)
        actions.deleteBehavior(data);
      else if (data.type === AGENTS.Behavior)
        actions.deleteBehavior(data);
      else if (data.type === AGENTS.Endpoint)
        actions.deleteEndpoint(data);
      else if (data.type === AGENTS.Event) {
        actions.deleteEvent(data);
      } else if (data.type === AGENTS.Goal) {
        actions.deleteGoal(data);
      }
    });
    rdfGraph.addAll(quads);
    actions.saveAgentGraph(globals.ajax, repo, that.dataBus)
    window.location.reload();
  });
}
