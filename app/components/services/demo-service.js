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
  connectionError: false,
  socketRef: null,
  response: "",
  px2em: 16,
  grabbed: "",

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
    this.actions.connect();
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

function getDemoObject(value) {
  let object = "";
  switch (value) {
    case "http://www.ajan.de/ajan-ns#PurpleBlock":
      object = that.purple;
      break;
    case "http://www.ajan.de/ajan-ns#OrangeBlock":
      object = that.orange;
      break;
    case "http://www.ajan.de/ajan-ns#BlueBlock":
      object = that.blue;
      break;
    case "http://www.ajan.de/ajan-ns#GreenBlock":
      object = that.green;
      break;
    case "http://www.ajan.de/ajan-ns#OrangeBlock":
      object = that.table;
      break;
    default:
      object = that.table;
  }
  return object;
}

function initScene() {
  console.log("init scene");
  initBlock(that.get("purple"));
  initBlock(that.get("orange"))
  initBlock(that.get("blue"))
  initBlock(that.get("green"));
}

function initBlock(block) {
  let $block = $("#" + block.id  + "");
  $block.css("left", grid[block.d1][block.d2].x + "em");
  $block.css("top", grid[block.d1][block.d2].y + "em");
}

async function moveArm2Init(action) {
    let $arm = $("#" + that.get("arm.id") + "");
    let armTop = parseInt($arm.css("top"), 10) / that.get("px2em");
    let armLeft = parseInt($arm.css("left"), 10) / that.get("px2em");

    for(let i=armTop; i>=that.get("arm.y"); i--) {
      $arm.css("top", i + "em");
      await timer(50);
    }
    $arm.css("top", that.get("arm.y") + "em");
    sendResponse(action);
}

async function pickUpBlock(action) {
  let block = getDemoObject(action.blockX);
  let $block = $("#" + block.id + "");
  let $arm = $("#" + that.get("arm.id") + "");

  if($arm.hasClass("closed")) {
    $arm.removeClass("closed");
    $arm.addClass("open");
  }

  let armTop = parseInt($arm.css("top"), 10) / that.get("px2em");
  let armLeft = parseInt($arm.css("left"), 10) / that.get("px2em");
  let cell = grid[block.d1][block.d2];
  let blockTop = cell.y;
  let blockLeft = cell.x + 4;

  if(armLeft <= blockLeft) {
    for(let i=armLeft; i<=blockLeft; i++) {
      $arm.css("left", i + "em");
      await timer(50);
    }
  } else {
    for(let i=armLeft; i>=blockLeft; i--) {
      $arm.css("left", i + "em");
      await timer(50);
    }
  }
  $arm.css("left", blockLeft + "em");

  for(let i=armTop; i<=blockTop; i++) {
    $arm.css("top", i + "em");
    await timer(50);
  }
  $arm.css("top", blockTop + "em");

  if($arm.hasClass("open")) {
    $arm.removeClass("open");
    $arm.addClass("closed");
  }

  armTop = parseInt($arm.css("top"), 10) / that.get("px2em");
  for(let i=armTop; i>=that.get("arm.y"); i--) {
    $arm.css("top", i + "em");
    $block.css("top", i + "em");
    await timer(50);
  }
  $arm.css("top", that.get("arm.y") + "em");
  $block.css("top", that.get("arm.y") + "em");

  that.set("grabbed", block);
  sendResponse(action);
}

async function stackBlock(action) {
  let block = getDemoObject(action.blockX);
  let dest = getDemoObject(action.blockY);
  let $arm = $("#" + that.get("arm.id") + "");
  let $block = $("#" + block.id + "");
  let $dest = $("#" + dest.id + "");

  let armTop = parseInt($arm.css("top"), 10) / that.get("px2em");
  let armLeft = parseInt($arm.css("left"), 10) / that.get("px2em");
  let destTop = parseInt($dest.css("top"), 10) / that.get("px2em") - 4;
  let destLeft = parseInt($dest.css("left"), 10) / that.get("px2em");

  if(armLeft <= destLeft) {
    for(let i=armLeft; i<=destLeft; i++) {
      $arm.css("left", i + 4 + "em");
      $block.css("left", i + "em");
      await timer(50);
    }
  } else {
    for(let i=armLeft; i>=destLeft; i--) {
      $arm.css("left", i + 4 + "em");
      $block.css("left", i + "em");
      await timer(50);
    }
  }
  $arm.css("left", destLeft + 4 + "em");
  $block.css("left", destLeft + "em");

  armTop = parseInt($arm.css("top"), 10) / that.get("px2em");
  for(let i=armTop; i<destTop+1; i++) {
    $arm.css("top", i + "em");
    $block.css("top", i+ "em");
    await timer(50);
  }
  $arm.css("top", destTop + "em");
  $block.css("top", destTop + "em");

  if($arm.hasClass("closed")) {
    $arm.removeClass("closed");
    $arm.addClass("open");
  }

  that.set("grabbed", "");

  moveArm2Init(action);
}

async function unStackBlock(action) {
  let block = getDemoObject(action.blockX);
  let $block = $("#" + block.id + "");
  let $arm = $("#" + that.get("arm.id") + "");

  if($arm.hasClass("closed")) {
    $arm.removeClass("closed");
    $arm.addClass("open");
  }

  let armTop = parseInt($arm.css("top"), 10) / that.get("px2em");
  let armLeft = parseInt($arm.css("left"), 10) / that.get("px2em");
  let blockTop = parseInt($block.css("top"), 10) / that.get("px2em");
  let blockLeft = parseInt($block.css("left"), 10) / that.get("px2em");

  if(armLeft <= blockLeft) {
    for(let i=armLeft; i<=blockLeft; i++) {
      $arm.css("left", i + 4 + "em");
      await timer(50);
    }
  } else {
    for(let i=armLeft; i>=blockLeft; i--) {
      $arm.css("left", i + 4 + "em");
      await timer(50);
    }
  }
  $arm.css("left", blockLeft + 4 + "em");

  for(let i=armTop; i<=blockTop; i++) {
    $arm.css("top", i + "em");
    await timer(50);
  }
  $arm.css("top", blockTop + "em");

  if($arm.hasClass("open")) {
    $arm.removeClass("open");
    $arm.addClass("closed");
  }

  armTop = parseInt($arm.css("top"), 10) / that.get("px2em");
  for(let i=armTop; i>=that.get("arm.y"); i--) {
    $arm.css("top", i + "em");
    $block.css("top", i + "em");
    await timer(50);
  }
  $arm.css("top", that.get("arm.y") + "em");
  $block.css("top", that.get("arm.y") + "em");

  that.set("grabbed", block);

  sendResponse(action);
}

async function putDownBlock(action) {
  let block = getDemoObject(action.blockX);
  let $arm = $("#" + that.get("arm.id") + "");
  let $block = $("#" + block.id + "");

  let armTop = parseInt($arm.css("top"), 10) / that.get("px2em");
  let armLeft = parseInt($arm.css("left"), 10) / that.get("px2em");

  let tableTop = grid[0][that.get("table." + block.name + "")].y;
  let tableLeft = grid[0][that.get("table." + block.name + "")].x;

  if(armLeft <= tableLeft) {
    for(let i=armLeft; i<=tableLeft; i++) {
      $arm.css("left", i + 4 + "em");
      $block.css("left", i + "em");
      await timer(50);
    }
  } else {
    for(let i=armLeft; i>=tableLeft; i--) {
      $arm.css("left", i + 4 + "em");
      $block.css("left", i + "em");
      await timer(50);
    }
  }
  $arm.css("left", tableLeft + 4 + "em");
  $block.css("left", tableLeft + "em");

  armTop = parseInt($arm.css("top"), 10) / that.get("px2em");
  for(let i=armTop; i<tableTop+1; i++) {
    $arm.css("top", i + "em");
    $block.css("top", i + "em");
    await timer(50);
  }
  $arm.css("top", tableTop + "em");
  $block.css("top", tableTop + "em");

  if($arm.hasClass("closed")) {
    $arm.removeClass("closed");
    $arm.addClass("open");
  }

  that.set("grabbed", "");
  moveArm2Init(action);
}

function myOpenHandler(event) {
  console.log(`On open event has been called: ${event}`);
  that.set("wssConnection", true);
}

function myMessageHandler(event) {
  console.log(`Message: ${event.data}`);
  let action = $.parseJSON(event.data);
  console.log(action);
  if (action.init) initScene();
  else if (action.action == "pickUp") {
    pickUpBlock(action);
  } else if (action.action == "stack") {
    stackBlock(action);
  } else if (action.action == "unStack") {
    unStackBlock(action);
  } else if (action.action == "putDown") {
    putDownBlock(action);
  }
}

function myCloseHandler(event) {
  console.log(`On close event has been called: ${event}`);
  that.get('websockets').closeSocketFor("ws://" + document.location.hostname + ":4203");
  that.set("wssConnection", false);
  that.set("connectionError", true);
}

function setTriplestoreField() {
  $(".store-url").text(localStorage.currentStore);
}

function sendResponse(action) {
  console.log(action.asyncResponse);
  console.log(action.requestURI);
  return $.ajax({
    url: action.requestURI,
    type: "POST",
    contentType: "text/turtle",
    data: action.asyncResponse,
  }).catch (function (error) {
    console.log(error);
  });
}

