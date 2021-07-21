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
import JsonLdParser from "npm:rdf-parser-jsonld";
import stringToStream from "npm:string-to-stream";
import { RDF, RDFS, ACTN, AGENTS } from "ajan-editor/helpers/RDFServices/vocabulary";

let $ = Ember.$;
let parser = new JsonLdParser();

export default {

  getAllAgents: function (endpoint, templates) {
    let obj = $.ajax({
      url: endpoint,
      type: "GET",
      headers: { Accept: "application/ld+json" }
    }).then(function (data) {
      return getGraph(data);
    }).then(function (graph) {
      return getAgents(graph, templates);
    });
    return obj;
  },

  createAgent: function (endpoint, content) {
    return $.ajax({
      url: endpoint,
      type: "POST",
      contentType: "text/turtle",
      data: content
    }).catch(function (error) {
      console.log(error);
    });
  },

  sendMsgToAgent: function (endpoint, content) {
    return $.ajax({
      url: endpoint,
      type: "POST",
      contentType: "application/trig",
      data: content,
      headers: { Accept: "application/ld+json" }
    }).catch(function (error) {
      console.log(error);
    });
  },

  deleteAgent: function (endpoint) {
    return $.ajax({
      url: endpoint,
      type: "DELETE",
    }).then(function (data) {
      console.log(endpoint + "deleted!");
    }).catch(function (error) {
      console.log(error);
    });
  },
};

function getGraph(data) {
  const quadStream = parser.import(stringToStream(JSON.stringify(data)));
  let obj = rdf
    .dataset()
    .import(quadStream)
    .then(function (dataset) {
      return dataset;
    });
  return obj;
}

function getAgents(graph, templates) {
    let agents = new Array();
    graph.forEach(quad => {
      if (
        quad.predicate.value === RDF.type
        && quad.object.value === AGENTS.Agent
      ) {
        agents.push(getAgentInstance(graph, quad.subject.value, templates));
      }
    });
    return agents;
}

function getAgentInstance(graph, uri, templates) {
  let agent = {};
  let actions = new Array();
  agent.uri = uri;
  agent.behaviors = new Array();
  graph.forEach(quad => {
    if (quad.subject.value === uri) {
      if (quad.predicate.value === AGENTS.agentId) {
        agent.id = quad.object.value;
      }
      if (quad.predicate.value === AGENTS.agentTemplate) {
        agent.template = quad.object.value;
      }
      if (quad.predicate.value === AGENTS.agentKnowledge) {
        agent.knowledge = quad.object.value;
      }
      if (quad.predicate.value === AGENTS.behavior) {
        console.log(quad.object.value);
        let behavior = {};
        behavior.uri = quad.object.value;
        graph.forEach(innerquad => {
          if (innerquad.subject.value === behavior.uri) {
            if (innerquad.predicate.value === RDFS.label)
              behavior.name = innerquad.object.value;
            if (innerquad.predicate.value === RDFS.isDefinedBy)
              behavior.defined = innerquad.object.value;
          }
        });
        agent.behaviors.push(behavior);
      }
      if (quad.predicate.value === ACTN.action) {
        let action = {};
        action.uri = quad.object.value;
        action.agentMessage = "";
        action.label = "";
        action.capability = quad.object.value.split("capability=")[1];
        actions.push(action);
      }
    }
  });
  let template = templates.filter(tmpl => tmpl.uri === agent.template)[0];
  if (template) {
    actions.forEach(actn => {
      let endpoint = template.endpoints.filter(endp => endp.capability === actn.capability)[0];
      actn.label = endpoint.label;
    });
  }
  agent.actions = actions;
  return agent;
}
