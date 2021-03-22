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

let that;
let $ = Ember.$;

export default Ember.Component.extend({
  websockets: Ember.inject.service(),
  wssConnection: false,
  socketRef: null,
  response: "",
  wssMessage: {},

  didInsertElement() {
    this._super(...arguments);
    that = this;
    setTriplestoreField();
    this.set("wssMessage.body", "Here you can see the output of the TestService (testService.js) that it received via an HTTP/POST (Content-Type: text/turtle; Request-URI: http://localhost:4201/post) message.");
    getResponseMessage();
  },

  willDestroyElement() {
    this._super(...arguments);
    this.actions.disconnect();
  },

  actions: {
    connect() {
      var socket = that.get('websockets').socketFor('ws://localhost:4201');
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
        that.get('websockets').closeSocketFor('ws://localhost:4201');
        that.set('socketRef', null);
      }
    },

    clean() {
      that.set("wssMessage", "");
    },

    setResponse(content) {
      Promise.resolve(content)
        .then(x => {
          Promise.resolve(sendResponseMessage(content))
            .then(function () {
              $("#send-message").trigger("showToast");
              that.set("messageError", "");
            });
        })
        .catch(function (error) {
          that.set("messageError", uri);
        });
    }
  }
})

function myOpenHandler(event) {
  console.log(`On open event has been called: ${event}`);
  that.set("wssConnection", true);
}

function myMessageHandler(event) {
  console.log(`Message: ${event.data}`);
  that.set("wssMessage", JSON.parse(event.data));
}

function myCloseHandler(event) {
  console.log(`On close event has been called: ${event}`);
  that.get('websockets').closeSocketFor('ws://localhost:4201');
  that.set("wssConnection", false);
}

function setTriplestoreField() {
  $(".store-url").text(localStorage.currentStore);
}

function getResponseMessage() {
  return $.ajax({
    url: "http://localhost:4201/getResponse",
    type: "GET",
    headers: { Accept: "text/plain" }
  }).then(function (data) {
    console.log(data);
    that.set("response", data);
  }).catch(function (error) {
    alert("No TestServiceAction Service is running on http://localhost/4201");
  });
}

function sendResponseMessage(content) {
  return $.ajax({
    url: "http://localhost:4201/response",
    type: "POST",
    contentType: "text/plain",
    data: content,
  }).then(function (data) {
    $("#send-message").trigger("showToast");
    getResponseMessage();
  }).catch (function (error) {
    console.log(error);
  });
}
