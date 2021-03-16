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
      that.actions.disconnect();
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
      let $textarea = $("#report-service-message-content");
      $textarea.empty();
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

    let report = result[0][0];
    if (report.agent != that.get("activeInstance.uri")) {
      return;
    }

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
    }).text(new Date().toUTCString() + ": ");
    let $message = null;

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

      let behavior = report.bt;
      let $behavior = $(".agent-behavior[behavior='" + behavior + "']");
      $behavior.find("a.debug").removeClass("hidden");

      $messageTime.append($debug);
      $message = $("<p>", {}).append($report);
    } else {
      that.set("debugReport", null);
      let $report = $("<i>", {
        class: status
      }).text(report.label);
      $message = $("<p>", {}).append($report);
    }

    let $textarea = $("#report-service-message-content");
    $textarea.append($messageTime).append($message);
    $("#report-service-message").scrollTop($("#report-service-message")[0].scrollHeight);
  });
}

function myCloseHandler(event) {
  console.log(`On close event has been called: ${event}`);
  that.get('websockets').closeSocketFor('ws://localhost:4202');
  that.set("wssConnection", false);
}
