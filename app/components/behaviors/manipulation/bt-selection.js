/*
 * Created on Tue Nov 10 2020
 *
 * The MIT License (MIT)
 * Copyright (c) 2020 André Antakli, Alex Grethen (German Research Center for Artificial Intelligence, DFKI).
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
import { observer } from "@ember/object";
import parser from "ajan-editor/helpers/behaviors/parser";
import graphOperations from "ajan-editor/helpers/graph/graph-operations";
import btStateParser from "ajan-editor/helpers/RDFServices/activeBTRDFConsumer";
import { BT } from "ajan-editor/helpers/RDFServices/vocabulary";
import reportConsumer from "ajan-editor/helpers/RDFServices/reportRDFConsumer";

let that;

export default Component.extend({
	selectedValue: undefined,
  selectedValueName: undefined,
  wssConnection: false,
  wssMessage: "",
  socketRef: null,
  activeBT: null,

  websockets: Ember.inject.service(),
  dataBus: Ember.inject.service(),

  init() {
    this._super(...arguments);
    that = this;
  },

	selectedValueChange: observer("selectedValue", function() {
    let bt = this.get("availableBTs").find((bt) => bt.uri === this.get("selectedValue"));
    if (bt)
      this.set("selectedValueName", bt.name);
	}),


	selectedBTChange: observer("selectedValue", function() {
		localStorage.setItem("bt-selected", this.get("selectedValue"));
		selectBT();
	}),

	behaviorGraphsChange: observer("availableBTs", function() {
    this.set("selectedValue", localStorage.getItem("bt-selected"));
	})

});

function selectBT() {
  let selectedURI = that.get("selectedValue");
  const urlParams = new URLSearchParams(window.location.search);
  let bt = urlParams.get('bt');
  that.set("activeBT", bt);
  if (bt) {
    $.ajax({
      url: bt + "?method=info&mode=detail",
      type: "GET",
    }).then(function (data) {
      btStateParser.getActiveBTGraph(data).then((states) => {
        let activeBT = states.filter(item => item.type === BT.BehaviorTree);
        if (activeBT[0] && activeBT[0].defined) {
          setSelectedBT(activeBT[0].defined, states);
          wssConnect();
        } else {
          setSelectedBT(selectedURI);
        }
      })
    });
  } else {
    setSelectedBT(selectedURI);
  }
}

function setSelectedBT(selectedURI, states) {
  that.get('dataBus').exportBT();
  let behaviorGraphs = that.get("availableBTs");
  let cy = that.get("cyRef");
  //find matching graph
  let graphUnparsed = behaviorGraphs.findBy("uri", selectedURI) || behaviorGraphs[0];
  //set selection
  that.set("selectedValue", graphUnparsed.uri);
  // Store index for next session
  localStorage.setItem("bt-selected", graphUnparsed.uri);
  //parse correct graph
  let graph = parser.behavior2cy(graphUnparsed, states);
  console.log(graph);
  try {
    cy.$().remove();
    cy.add(graph.nodes);
    cy.add(graph.edges);
  } catch (e) {
    console.warn("Errors while creating graph:", e);
  }
  // update the graph
  graphOperations.updateGraphInit(cy);
}

function wssConnect() {
  const urlParams = new URLSearchParams(window.location.search);
  let connection = urlParams.get('wssConnection');
  console.log(connection);
  if (connection) {
    console.log("connect");
    console.log("ws://" + document.location.hostname + ":4202");
    var socket = that.get('websockets').socketFor("ws://" + document.location.hostname + ":4202");
    console.log(socket);
    socket.on('open', myOpenHandler, that);
    socket.on('message', myMessageHandler, that);
    socket.on('close', myCloseHandler, that);
    that.set('socketRef', socket);
  }
  
}

function myOpenHandler(event) {
  console.log(`On open event has been called: ${event}`);
  that.set("wssConnection", true);
  that.set("wssMessage", "");
  //setNodeState();
}

function myMessageHandler(event) {
  let rdf = reportConsumer.getReportGraph(event.data);
  let promise = Promise.resolve(rdf);
  promise.then(function (result) {
    if (result[0].length == 0) {
      return;
    }
    // TODO: manipulate selected BT
    let log = result[0][0];
    if (that.get("activeBT") == log.bt) {
      setNodeState(log);
    }
  });
}

function myCloseHandler(event) {
  console.log(`On close event has been called: ${event}`);
  that.get('websockets').closeSocketFor("ws://" + document.location.hostname + ":4202");
  that.set("wssConnection", false);
  that.set('socketRef', null);
}

function setNodeState(log) {
  let cy = that.get("cyRef");
  let elements = cy.elements();
  $.ajax({
      url: that.get("activeBT") + "?method=info&mode=detail",
      type: "GET",
    }).then(function (data) {
      btStateParser.getActiveBTGraph(data).then((states) => {
        for (let i = 0; i < elements.size(); i++) {
          let state = states.filter(item => item.defined === elements[i].data().uri);
          if (state[0] && state[0].state) {
            switch (state[0].state) {
              case "FRESH":
                elements[i].style("border-color", "#000");
                elements[i].style("border-width", "3px");
                break;
              case "SUCCEEDED":
                elements[i].style("border-color", "#32a852");
                elements[i].style("border-width", "7px");
                break;
              case "FAILED":
                elements[i].style("border-color", "#a83232");
                elements[i].style("border-width", "7px");
                break;
              case "RUNNING":
                elements[i].style("border-color", "#325ca8");
                elements[i].style("border-width", "7px");
                break;
              default:
                elements[i].style("border-color", "#000");
                elements[i].style("border-width", "3px");
                break;
            }
          }
        }
      })
    });
}
