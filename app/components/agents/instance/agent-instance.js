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
import actions from "ajan-editor/helpers/agents/instance/actions";

let that;

export default Ember.Component.extend({
  databus: Ember.inject.service('data-bus'),
  overview: null,
  activeInstance: {},
  agentMessage: "<http://test/Test1> <http://test/test> <http://test/Test> .",
  messageError: "",
  wssConnection: false,
  wssMessage: "",
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
  let report = event.data;
  that.set("wssMessage", report);
  let status = "normal-report";
  if (report.includes('SUCCEEDED')) {
    status = "succeeded-report";
  } else if (report.includes('FAILED')) {
    status = "failed-report";
  } else if (report.includes('CANCELLED')) {
    status = "cancelled-report";
  } else if (report.includes('FINISHED') || report.includes('STARTING')) {
    status = "bt-report";
  }

  let $message = null;

  if (report.includes('DEBUGGING')) {
    let $debug = $("<i>", {
      class: "failed-report"
    }).text("DEBUGGING: ");

    let text = event.data;
    text = text.replace("DEBUGGING: ", "");
    let $report = $("<i>", {
      class: status
    }).text(text);

    $message = $("<p>", {
      class: status
    }).text(new Date().toUTCString() + ": ")
      .append($debug).append($report);
  } else {
    let $report = $("<i>", {
      class: status
    }).text(event.data);
    $message = $("<p>", {
      class: status
    }).text(new Date().toUTCString() + ": ")
      .append($report);
  }
  let $textarea = $("#report-service-message-content");
  $textarea.append($message);

  $("#report-service-message").scrollTop($("#report-service-message")[0].scrollHeight);
}

function myCloseHandler(event) {
  console.log(`On close event has been called: ${event}`);
  that.get('websockets').closeSocketFor('ws://localhost:4202');
  that.set("wssConnection", false);
}
