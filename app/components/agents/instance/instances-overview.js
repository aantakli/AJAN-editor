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
  socketAvailble: false,
  agentInitMessage: "",
  activeInstance: {},
  allInstances: new Array(),
  ajanServiceHost: "",
  ajanService: "",
  ajanAgentsRoot: "/ajan/agents/",
  websockets: Ember.inject.service(),
  init() {
    this._super(...arguments);
    that = this;
    setTriplestoreField();

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
      localStorage.ajanService = "http://" + document.location.hostname + ":8080";
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
        if (!value) return;
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
      let agents = actions.getAllAgents(getAgentServiceURL(service), templates);
      Promise.resolve(agents).then(function (data) {
        that.set("allInstances", data);
        that.actions.setActiveInstance(data[0]);
      }).catch(function (error) {
        alert("The specified AJAN service is not available!");
      });
    }
  },

	willDestroyElement() {
		this._super(...arguments);
	}

});

function getAgentServiceURL(url) {
  let serviceURL = new URL(url);
  return serviceURL.protocol + "//" + serviceURL.hostname + ":" + serviceURL.port + that.ajanAgentsRoot;
}

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

function setTriplestoreField() {
  $(".store-url").text(localStorage.currentStore);
}

function loadAgentRdfGraphData() {
  let repo = (localStorage.currentStore || "http://" + document.location.hostname + ":8090/rdf4j/repositories")
    + globals.agentsRepository;
  templateActns.getFromServer(ajax, repo).then(agentRDFDataHasLoaded);
}

function agentRDFDataHasLoaded(rdfData) {
  rdfGraph.reset();
  rdfGraph.set(rdfData);
  setAvailableTemaplates();
}

function setAvailableTemaplates() {
  let templates = templateActns.getAgents();
  that.set("availableTemplates", templates);
  that.actions.loadAgents();
}

function createModal() {

  if (!localStorage.getItem("initAgents")) {
    console.log("empty");
    let initAgents = {};
    localStorage.setItem("initAgents", JSON.stringify(initAgents));
    console.log(localStorage.initAgents);
  }

  let $textAreaInput;

  $("#modal-header-title").text("New Agent Instance");
  let $body = $("#modal-body"),
    $modal = $("#universal-modal");
  $body.empty();
  $modal.show();

  // Label
  let $labelTitle = $("<p>", {
    class: "modal-p"
  }).text("ID: ");
  let $labelInput = $("<input>", {
    class: "modal-input",
    id: "label-input",
    placeholder: "ID"
  });

  $labelInput.change(function () {
    let agentId = $labelInput.val();
    let storage = JSON.parse(localStorage.initAgents);
    if (storage[agentId]) {
      $textAreaInput.val(storage[agentId]);
    }
  });

  let $labelDiv = $("<div>", {
    class: "modal-body-div"
  }).append($labelTitle, $labelInput);
  // Append to modal body
  $body.append($labelDiv);

  // Credentials
  let $credentialsTitle = $("<p>", {
    class: "modal-p"
  }).text("Password (Optional, if agent knowledge shall be secured): ");

  let $pswdInput = $("<input type='password' id='pswd-input'>", {});
  let $credentialsDiv = $("<div>", {
    class: "modal-body-div"
  }).append($credentialsTitle, $pswdInput);
  // Append to modal body
  
  let repos = JSON.parse(localStorage.triplestores);
    repos.forEach(repo => {
      if (repo.uri == localStorage.currentStore) {
        if (repo.secured) {
          $body.append($credentialsDiv);
        }
      }
    });

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
  $textAreaInput = $("<textarea>", {
    class: "modal-textarea",
    id: "textarea-input",
    rows: 10,
    cols: 62,
    placeholder: "Insert RDF/Turtle Graph!",
  });

  let $textAreaDiv = $("<div>", {
    class: "modal-body-div"
  }).append($textAreaTitle, $textAreaInput);
  // Append to modal body
  $body.append($textAreaDiv);


  // Logs
  var socket = that.get('websockets').socketFor("ws://" + document.location.hostname + ":4202");
  console.log(socket.readyState());
  socket.on('open', function () {
    console.log("socket connected");
    $body.append(createLogsField());
    that.get('websockets').closeSocketFor("ws://" + document.location.hostname + ":4202");
  }, that);
  if (socket.readyState() == 1) {
    console.log("socket open");
    $body.append(createLogsField());
  }


  // Listen for the confirm event
  let elem = document.getElementById("universal-modal");
  elem.addEventListener("modal:confirm", createAgentInitEvent);
  elem.addEventListener("modal:cancel", () => {
    $("#select-agent-templates").show().appendTo("#templates-wrapper");
    that.set("initAgentMessage", "");
  });
  elem.addEventListener("modal:confirm", createAgentInitEvent);
}

function createLogsField() {
  let $logsTitle = $("<p>", {
    class: "modal-p"
  }).text("Show Logs: ");
  let $logsInput = $("<input id='show-agent-logs' type='checkbox'>");

  let $logsDiv = $("<div>", {
    class: "modal-body-div"
  }).append($logsTitle, $logsInput);
  // Append to modal body
  return $logsDiv;
}

function createAgentInitEvent() {
  $("#select-agent-templates").show().appendTo("#templates-wrapper");
  createInitMessage(
    $("#label-input"),
    $("#show-agent-logs"),
    $("#pswd-input"),
    that.get("selectedTemplate"),
    $("#textarea-input").val());
}

function createInitMessage(label, logs, pswd, templateUri, knowledge) {
  let agentId = label.val();

  let list = JSON.parse(localStorage.initAgents);
  list[agentId] = knowledge;
  localStorage.setItem("initAgents", JSON.stringify(list));

  console.log(templateUri);
  if (agentId === "") {
    $("#error-message").trigger("showToast", [
      "No Agent ID was defined!"
    ]);
    return;
  }
  let logsRDF = "";
  if (logs && logs.is(':checked')) {
    logsRDF = "_:init <http://www.ajan.de/ajan-ns#agentInitKnowledge> [ <http://www.ajan.de/ajan-ns#agentReportURI> 'http://" + document.location.hostname + ":4202/report'^^<http://www.w3.org/2001/XMLSchema#anyURI> ] .";
  }
  if (templateUri === null) {
    $("#error-message").trigger("showToast", [
      "No Agent Template was defined!"
    ]);
    return;
  }
  let type = "_:init <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://www.ajan.de/ajan-ns#AgentInitialisation> . ";
  let name = "_:init <http://www.ajan.de/ajan-ns#agentId> '" + agentId + "'^^<http://www.w3.org/2001/XMLSchema#string> . ";
  let tmpl = "_:init <http://www.ajan.de/ajan-ns#agentTemplate> <" + templateUri + "> . ";
  let credentials = "";

  if (pswd != null && pswd != "") {
    let repo = (localStorage.currentStore.replace("/rdf4j/repositories", "") || "http://" + document.location.hostname + ":8090/")
    + "tokenizer/token";
    credentials = "_:init <http://www.ajan.de/ajan-ns#agentTokenController> '" + repo + "'^^<http://www.w3.org/2001/XMLSchema#string> . ";
    credentials += "_:init <http://www.ajan.de/ajan-ns#agentPassword> '" + pswd + "'^^<http://www.w3.org/2001/XMLSchema#string> . ";
    console.log(credentials);
  }

  let know = getAgentInitKnowledge(knowledge);
  Promise.resolve(know).then(x => {
    if (x != undefined) {
      let content = type + name + tmpl + credentials + x + knowledge + logsRDF;
      let agents = actions.createAgent(that.get("ajanService") + that.ajanAgentsRoot, content);
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
