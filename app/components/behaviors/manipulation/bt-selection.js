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
import {computed, observer} from "@ember/object";
import parser from "ajan-editor/helpers/behaviors/parser";
import graphOperations from "ajan-editor/helpers/graph/graph-operations";
import btStateParser from "ajan-editor/helpers/RDFServices/activeBTRDFConsumer";
import { BT } from "ajan-editor/helpers/RDFServices/vocabulary";

export default Component.extend({
	selectedValue: undefined,
	selectedValueName: undefined,
  dataBus: Ember.inject.service(),
	selectedValueChange: observer("selectedValue", function() {
    let bt = this.get("availableBTs").find((bt) => bt.uri === this.get("selectedValue"));
    if (bt)
      this.set("selectedValueName", bt.name);
	}),


	selectedBTChange: observer("selectedValue", function() {
		localStorage.setItem("bt-selected", this.get("selectedValue"));
		selectBT(this);
	}),

	behaviorGraphsChange: observer("availableBTs", function() {
    this.set("selectedValue", localStorage.getItem("bt-selected"));
	})

});

function selectBT(that) {
  let selectedURI = that.get("selectedValue");
  const urlParams = new URLSearchParams(window.location.search);
  let bt = urlParams.get('bt');
  if (bt) {
    $.ajax({
      url: bt + "?method=info&mode=detail",
      type: "GET",
    }).then(function (data) {
      btStateParser.getActiveBTGraph(data).then((states) => {
        let activeBT = states.filter(item => item.type === BT.BehaviorTree);
        if (activeBT[0] && activeBT[0].defined) {
          setSelectedBT(that, activeBT[0].defined, states);
        } else {
          setSelectedBT(that, selectedURI);
        }
      })
    });
  } else {
    setSelectedBT(that, selectedURI);
  }
}

function setSelectedBT(that, selectedURI, states) {
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
