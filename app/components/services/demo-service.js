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

const timer = ms => new Promise(res => setTimeout(res, ms))

let grid = [[{ "x": 0, "y": 0 }, { "x": 9, "y": 0 }, { "x": 18, "y": 0 }, { "x": 27, "y": 0 }],
[{ "x": 0, "y": -4 }, { "x": 9, "y": -4 }, { "x": 18, "y": -4 }, { "x": 27, "y": -4 }],
[{ "x": 0, "y": -8 }, { "x": 9, "y": -8 }, { "x": 18, "y": -8 }, { "x": 27, "y": -8 }],
[{ "x": 0, "y": -12 }, { "x": 9, "y": -12 }, { "x": 18, "y": -12 }, { "x": 27, "y": -12 }]];

export default Ember.Component.extend({
  websockets: Ember.inject.service(),
  wssConnection: false,
  socketRef: null,
  response: "",
  px2em: 16,

  arm: { "id": "demo-arm", "closed": true, "x": 4, "y": -23 },
  purple: { "id": "demo-block-purple", "name": "purple", "d1": 0, "d2": 0 },
  orange: { "id": "demo-block-orange", "name": "orange", "d1": 0, "d2": 1 },
  blue: { "id": "demo-block-blue", "name": "blue", "d1": 0, "d2": 2 },
  green: { "id": "demo-block-green", "name": "green", "d1": 0, "d2": 3 },
  table: { "id": "demo-table", "name": "table", "purple": 0, "orange": 1, "blue": 2, "green": 3 },

  didInsertElement() {
    this._super(...arguments);
    that = this;
    setTriplestoreField();
    setPX2EM();
    grapBlock(this.orange);
  },

  willDestroyElement() {
    this._super(...arguments);
    this.actions.disconnect();
  },

  actions: {
    connect() {
      var socket = that.get('websockets').socketFor("ws://" + document.location.hostname + ":4203");
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
        that.get('websockets').closeSocketFor("ws://" + document.location.hostname + ":4203");
        that.set('socketRef', null);
      }
    },

    clean() {
      that.set("wssMessage", "");
    },
  }
})

function setPX2EM() {
    let $arm = $("#" + that.get("arm.id") + "");
    let armTop = parseInt($arm.css("top"), 10);
    let y = that.get("arm.y");
    let value = (armTop) / (y);
    that.set("px2em", value);
}

function setBlockPosition(block, destination) {
  if (destination.name == "table") return;
  else {
    let $block = $("#" + block.id + "");
    console.log($block);

    let $destination = $("#" + destination.id + "");
    console.log($destination);
    console.log(grid[destination.d1][destination.d2]);
    let cell = grid[destination.d1][destination.d2];
    $block.css("top", cell.y + "em");
    $block.css("left", cell.x + "em");
  }
}

async function grapBlock(block) {
  let $block = $("#" + block.id + "");
  let $arm = $("#" + that.get("arm.id") + "");
  console.log($arm);
  if($arm.hasClass("closed")) {
    $arm.removeClass("closed");
    $arm.addClass("open");
  }

  let armTop = parseInt($arm.css("top"), 10) / that.get("px2em");
  let armLeft = parseInt($arm.css("left"), 10) / that.get("px2em");
  let cell = grid[block.d1][block.d2];
  let destTop = cell.y;
  let destLeft = cell.x + 4;

  console.log(armLeft, destLeft);

  for(let i=armLeft; i<=destLeft; i++) {
    console.log(i);
    $arm.css("left", i + "em");
    await timer(50);
  }

  for(let i=armTop; i<=destTop; i++) {
    console.log(i);
    $arm.css("top", i + "em");
    await timer(50);
  }

  if($arm.hasClass("open")) {
    $arm.removeClass("open");
    $arm.addClass("closed");
  }

  //$arm.css("top", top + "em");
  //$arm.css("left", left + "em");
}

function myOpenHandler(event) {
  console.log(`On open event has been called: ${event}`);
  that.set("wssConnection", true);
}

function myMessageHandler(event) {
  console.log(`Message: ${event.data}`);
}

function myCloseHandler(event) {
  console.log(`On close event has been called: ${event}`);
  that.get('websockets').closeSocketFor("ws://" + document.location.hostname + ":4203");
  that.set("wssConnection", false);
}

function setTriplestoreField() {
  $(".store-url").text(localStorage.currentStore);
}

function getResponseMessage() {
  return $.ajax({
    url: "http://localhost:4203/getResponse",
    type: "GET",
    headers: { Accept: "text/plain" }
  }).then(function (data) {
    console.log(data);
    that.set("response", data);
  }).catch(function (error) {
    alert("No AJAN Demo Service is running on http://" + document.location.hostname + ":4203");
  });
}

function sendResponseMessage(content) {
  return $.ajax({
    url: "http://" + document.location.hostname + ":4203/response",
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
