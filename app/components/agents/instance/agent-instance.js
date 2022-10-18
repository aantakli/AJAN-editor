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
import modal from "ajan-editor/helpers/ui/debug-modal";
import actions from "ajan-editor/helpers/agents/instance/actions";
import reportConsumer from "ajan-editor/helpers/RDFServices/reportRDFConsumer";

let that;

export default Ember.Component.extend({
  databus: Ember.inject.service('data-bus'),
  overview: null,
  activeInstance: {},
  agentLogs: [],
  agentMessage: "<http://test/Test1> <http://test/test> <http://test/Test> .",
  messageError: "",
  wssConnection: false,
  wssMessage: "",
  debugReport: null,
  prefixes: {
    "http://www.w3.org/1999/02/22-rdf-syntax-ns#": "rdf:",
    "http://www.w3.org/2000/01/rdf-schema#": "rdfs:",
    "http://www.w3.org/2001/XMLSchema#": "xsd:",
    "http://purl.org/dc/terms/": "dct:",
    "http://www.ajan.de/ajan-ns#": "ajan:",
    "http://www.ajan.de/behavior/bt-ns#": "bt:",
    "http://www.ajan.de/actn#": "actn:"
  },
  socketRef: null,
  websockets: Ember.inject.service(),

  init() {
    this._super(...arguments);
    that = this;
    this.get("activeInstance").actions = new Array();
  },

  didUpdate() {
    createLogs();
  },

  actions: {
    clipboarCopy(content) {
      console.log(this.get("activeInstance"));
      let textArea = document.createElement("textarea");
      textArea.value = content;
      textArea.style.top = "0";
      textArea.style.left = "0";
      textArea.style.position = "fixed";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      document.execCommand("copy");
      try {
        var successful = document.execCommand('copy');
        var msg = successful ? 'successful' : 'unsuccessful';
        console.log('Fallback: Copying text command was ' + msg);
      } catch (err) {
        console.error('Fallback: Oops, unable to copy', err);
      }
      document.body.removeChild(textArea);
    },

    sendMsgToAgent(uri, content) {
      let dataset = checkRDFContent(content);
      Promise.resolve(dataset)
        .then(x => {
          Promise.resolve(actions.sendMsgToAgent(uri, content))
            .then(function () {
              $("#send-message").trigger("showToast");
              that.set("messageError", "");
              $("#test textarea").val("");
          });
        })
        .catch(function (error) {
          that.set("messageError", uri);
        });
    },

    deleteAgent(uri) {
      let agents = that.get("agentLogs");
      that.set("agentLogs", agents.filter(item => item.uri !== uri));
      Promise.resolve(actions.deleteAgent(uri)).then(function () {
        that.databus.deletedAI();
      });
    },

    debug(uri, method) {
      const request = new XMLHttpRequest();
      request.open("GET", uri + method);
      request.send();
      let $behavior = $(".agent-behavior[behavior='" + uri + "']");
      $behavior.find("a.debug").addClass("hidden");
    },

    debugView(uri) {
      console.log(this.get("prefixes"));
      modal.createDebugModal(this.get("debugReport"), this.get("prefixes"));
    },

    connect() {
      console.log("connect");
      var socket = that.get('websockets').socketFor('ws://localhost:4202');
      console.log(socket);
      socket.on('open', myOpenHandler, that);
      socket.on('message', myMessageHandler, that);
      socket.on('close', myCloseHandler, that);
      that.set('socketRef', socket);
    },

    disconnect() {
      const socket = that.get('socketRef');
      if (socket != null) {
        socket.off('open', myOpenHandler);
        socket.off('message', myMessageHandler);
        socket.off('close', myCloseHandler);
        that.set("wssConnection", false);
        that.get('websockets').closeSocketFor('ws://localhost:4202');
        that.set('socketRef', null);
      }
    },

    clean() {
      emptyLogs();
    }
  },

	willDestroyElement() {
    this._super(...arguments);
	}
});

function checkRDFContent(content) {
  const parser = new N3Parser();
  const quadStream = parser.import(stringToStream(content));
  return rdf.dataset().import(quadStream);
}

function myOpenHandler(event) {
  console.log(`On open event has been called: ${event}`);
  that.set("wssConnection", true);
  that.set("wssMessage", "");
  let $textarea = $("#report-service-message-content");
  $textarea.empty();
}

function myMessageHandler(event) {
  let rdf = reportConsumer.getReportGraph(event.data);
  let promise = Promise.resolve(rdf);
  promise.then(function (result) {
    if (result[0].length == 0) {
      return;
    }
    storeAgentLogs(result);
    createLogs();
  });
}

function createLogs() {
  let agents = that.get("agentLogs");
  const i = agents.findIndex(e => e.uri === that.get("activeInstance.uri"));
  let $textarea = $("#report-service-message-content");
  $textarea.empty();
  if (i > -1) {
    let logs = agents[i].logs;
    logs.forEach(item => {
      createEditorMessage($textarea, agents[i].result, item);
    })
    $("#report-service-message").scrollTop($("#report-service-message")[0].scrollHeight);
  } else {
    $textarea.append("<p>To receive report messages from the agent LeafNodes, please run the ReportService (reportService.js) on Port 4202 and instantiate the agent with 'Show Logs' selected.</p>");
  }
}

function emptyLogs() {
  let agents = that.get("agentLogs");
  const i = agents.findIndex(e => e.uri === that.get("activeInstance.uri"));
  if (i > -1) {
    let $textarea = $("#report-service-message-content");
    $textarea.empty();
    agents[i].logs = [];
  }
}

function storeAgentLogs(result) {
  let report = result[0][0];
  let agents = that.get("agentLogs");
  if (!agents || agents.length == 0) {
    createAgentEntry(agents, getLastLog(report, result, null), report);
  } else {
    const i = agents.findIndex(e => e.uri === report.agent);
    if (i > -1) {
      agents[i].result = getLastLog(report, result, agents[i].result);
      agents[i].logs.push(createLog(report));
    } else {
      createAgentEntry(agents, getLastLog(report, result, null), report);
    }
  }
}

function createAgentEntry(agents, lastLog, report) {
  let logs = [];
  logs.push(createLog(report));
  agents.push({ uri: report.agent, lastLog: lastLog, logs: logs });
}

function getLastLog(report, result, lastLog) {
  if (!report.label.includes('BTRoot')) {
    return result;
  } else if (lastLog) {
    return lastLog;
  } else {
    return null;
  }
}

function createLog(report) {
  console.log(report.debugging);
  return { time: new Date().toUTCString(), bt: report.bt, debugging: report.debugging, label: report.label };
}

function createEditorMessage($textarea, result, report) {
  that.set("wssMessage", report);
  let status = "agent-report ";
  if (report.label.includes('SUCCEEDED')) {
    status = status + "succeeded-report";
  } else if (report.label.includes('FAILED')) {
    status = status + "failed-report";
  } else if (report.label.includes('CANCELLED')) {
    status = status + "cancelled-report";
  } else if (report.label.includes('FINISHED') || report.label.includes('STARTING')) {
    status = status + "bt-report";
  } else {
    status = status + "normal-report";
  }

  let $messageTime = $("<p>", {
    class: "report-time"
  }).text(report.time + ": ");
  let $message = null;
  let behavior = report.bt;
  let $behavior = $(".agent-behavior[behavior='" + behavior + "']");

  if (report.debugging) {
    if (!report.label.includes('BTRoot')) {
      that.set("debugReport", result);
    }

    let $debug = $("<i>", {
      class: "failed-report"
    }).text("DEBUGGING");

    let $report = $("<i>", {
      class: status
    }).text(report.label);

    $behavior.find("a.debug").removeClass("hidden");
    $messageTime.append($debug);
    $message = $("<p>", {}).append($report);
  } else {
    $behavior.find("a.debug").addClass("hidden");
    that.set("debugReport", null);
    let $report = $("<i>", {
      class: status
    }).text(report.label);
    $message = $("<p>", {}).append($report);
  }
  $textarea.append($messageTime).append($message);
}

function myCloseHandler(event) {
  console.log(`On close event has been called: ${event}`);
  that.get('websockets').closeSocketFor('ws://localhost:4202');
  that.set("wssConnection", false);
}
