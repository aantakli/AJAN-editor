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
import Ember from "ember";
import rdf from "npm:rdf-ext";
import N3Parser from "npm:rdf-parser-n3";
import stringToStream from "npm:string-to-stream";
import templateActns from "ajan-editor/helpers/agents/actions";
import globals from "ajan-editor/helpers/global-parameters";
import rdfGraph from "ajan-editor/helpers/RDFServices/RDF-graph";
import actions from "ajan-editor/helpers/agents/instance/actions";

let that;
let ajax = null;

export default Ember.Component.extend({
  ajax: Ember.inject.service(),
  dataBus: Ember.inject.service('data-bus'),
  availableTemplates: null,
  selectedTemplate: null,
  agentInitMessage: "",
  activeInstance: {},
  allInstances: new Array(),
  ajanServiceHost: "",
  ajanService: "",

  init() {
    this._super(...arguments);
    that = this;

    this.get('dataBus').on('deletedAI', function () {
      that.actions.loadAgents();
    });
  },

  didInsertElement() {
    initializeGlobals(this);
    loadAgentRdfGraphData();
    if (localStorage.ajanService == null
      || localStorage.ajanService === "undefined"
      || localStorage.ajanService === "") {
      localStorage.ajanService = "http://localhost:8080/ajan/agents/";
    }

    this.set("ajanService", localStorage.ajanService);
  },

  actions: {

    addAgent() {
      createModal();
    },

    setActiveInstance(value) {
      that.set("activeInstance", value);
      $("li.active").removeClass("active");
      $(function () {
        $("li[data-value='" + value.uri + "']").addClass("active");
      });
    },

    loadAgents() {
      let templates = that.get("availableTemplates");
      let service = that.get("ajanService");
      if (service == null
        || service === "undefined"
        || service === ""
        || !service.includes("http://")) {
        alert("No valid URL defined!");
        return;
      }
      localStorage.ajanService = service;
      let agents = actions.getAllAgents(service, templates);
      Promise.resolve(agents).then(function (data) {
        that.set("allInstances", data);
        that.actions.setActiveInstance(data[0]);
      }).catch(function (error) {
        alert("The specified AJAN service is not available!");
      });;
    }
  },

	willDestroyElement() {
		this._super(...arguments);
	}

});

function initializeGlobals(currentComponent) {
  setCurrentComponent(currentComponent);
  initializeAjax();
}

function setCurrentComponent(currentComponent) {
  globals.currentComponent = currentComponent;
}

function initializeAjax() {
  ajax = globals.currentComponent.get("ajax");
  globals.ajax = ajax;
}

function loadAgentRdfGraphData() {
  let repo = (localStorage.currentStore || "http://localhost:8090/rdf4j/repositories")
    + globals.agentsRepository;
  templateActns.getAgentFromServer(ajax, repo).then(agentRDFDataHasLoaded);
}

function agentRDFDataHasLoaded(rdfData) {
  rdfGraph.reset();
  rdfGraph.set(rdfData);
  setAvailableTemaplates();
}

function setAvailableTemaplates() {
  let templates = templateActns.getAgents();
  that.set("availableTemplates", templates);
}

function createModal() {
  $("#modal-header-title").text("New Agent Instance");
  let $body = $("#modal-body"),
    $modal = $("#universal-modal");
  $body.empty();
  $modal.show();

  // Label
  let $labelTitle = $("<p>", {
    class: "modal-p"
  }).text("Name: ");
  let $labelInput = $("<input>", {
    class: "modal-input",
    id: "label-input",
    placeholder: "Name"
  });
  let $labelDiv = $("<div>", {
    class: "modal-body-div"
  }).append($labelTitle, $labelInput);
  // Append to modal body
  $body.append($labelDiv);

  // Dropdown
  let $dropdownTitle = $("<p>", {
    class: "modal-p"
  }).text("Agent Template: ");
  let $dropdownDiv = $("<div>", {
    class: "modal-body-div"
  }).append($dropdownTitle);
  $("#select-agent-templates").show().appendTo($dropdownDiv);
  // Append to modal body
  $body.append($dropdownDiv);

  // TextArea
  let $textAreaTitle = $("<p>", {
    class: "modal-p"
  }).text("Initial Knowledge: ");
  let $textAreaInput = $("<textarea>", {
    class: "modal-textarea",
    id: "textarea-input",
    rows: 6,
    cols: 50,
    placeholder: "Insert RDF/Turtle Graph!",
  });
  let $textAreaDiv = $("<div>", {
    class: "modal-body-div"
  }).append($textAreaTitle, $textAreaInput);
  // Append to modal body
  $body.append($textAreaDiv);

  // Listen for the confirm event
  let elem = document.getElementById("universal-modal");
  elem.addEventListener("modal:confirm", createAgentInitEvent);
  elem.addEventListener("modal:cancel", () => {
    $("#select-agent-templates").show().appendTo("#templates-wrapper");
    that.set("initAgentMessage", "");
  });
  elem.addEventListener("modal:confirm", createAgentInitEvent);
}

function createAgentInitEvent() {
  $("#select-agent-templates").show().appendTo("#templates-wrapper");
  createInitMessage($("#label-input").val(), that.get("selectedTemplate"), $("#textarea-input").val());
}

function createInitMessage(label, templateUri, knowledge) {
  console.log(templateUri);
  if (label === "") {
    $("#error-message").trigger("showToast", [
      "No Agent Name was defined!"
    ]);
    return;
  }
  if (templateUri === null) {
    $("#error-message").trigger("showToast", [
      "No Agent Template was defined!"
    ]);
    return;
  }
  let type = "_:init <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://www.ajan.de/ajan-ns#AgentInitialisation> . ";
  let name = "_:init <http://www.ajan.de/ajan-ns#agentName> '" + label + "'^^<http://www.w3.org/2001/XMLSchema#string> . ";
  let tmpl = "_:init <http://www.ajan.de/ajan-ns#agentTemplate> <" + templateUri + "> . ";
  let know = getAgentInitKnowledge(knowledge);
  Promise.resolve(know).then(x => {
    if (x != undefined) {
      let content = type + name + tmpl + x + knowledge;
      let agents = actions.createAgent(that.get("ajanService"), content);
      Promise.resolve(agents).then(function (data) {
        that.actions.loadAgents();
      });
    }
  });
}

function getAgentInitKnowledge(content) {
  const parser = new N3Parser();
  const quadStream = parser.import(stringToStream(content));
  let dataset = rdf.dataset().import(quadStream);
  let returnValue = Promise.resolve(dataset)
    .then(x => {
      let knowledge = "";
      console.log(x);
      x._quads.forEach(quad => {
        let value = "";
        if (quad.subject.termType === "NamedNode") {
          value = "<" + quad.subject.value + ">";
          knowledge = knowledge + "_:init <http://www.ajan.de/ajan-ns#agentInitKnowledge> " + value + " . ";
        }
      });
      return knowledge;
    }).catch(function (error) {
      $("#error-message").trigger("showToast", [
        "Malformed Agent Init Knowledge!"
      ]);
    });
  return returnValue;
}
