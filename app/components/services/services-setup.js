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
import globals from "ajan-editor/helpers/global-parameters";
import actions from "ajan-editor/helpers/services/actions";
import rdfGraph from "ajan-editor/helpers/RDFServices/RDF-graph";

let $ = Ember.$;

// References
let ajax = null; // ajax
let self;

export default Ember.Component.extend({
  ajax: Ember.inject.service(),
  dataBus: Ember.inject.service('data-bus'),
	activeAction: null,
	availableServices: null,
	toggleState: true,
	// After the element has been inserted into the DOM
	didInsertElement() {
		this._super(...arguments);
		// ...
		self = this;
		initializeGlobals(this);
		loadRdfGraphData();
    setTriplestoreField();
    this.dataBus.updatedSG();

	}, // end didInsertElement


  // ******************** Declare actions ********************
	// actions used in the .hbs file
	actions: {
		setActiveService(service) {
			if (self.get('toggleState')) {
				self.toggleProperty('ServiceAction');
				self.set('toggleState', false);
			}
			self.set("activeAction", service);
			$("li.active").removeClass("active");
			$(function(){$("li[data-value='" + service.uri + "']").addClass("active");});
		},
		
		setActivePlugin(plugin) {
			if (!self.get('toggleState')) {
				self.toggleProperty('ServiceAction');
				self.set('toggleState', true);
			}
			self.set("activeAction", plugin);
			$("li.active").removeClass("active");
			$(function(){$("li[data-value='" + plugin.uri + "']").addClass("active");});
		},

		create() {
			let service = actions.createDefaultService(localStorage.currentStore);
			actions.createService(service);
			self.get("availableServices").addObject(service);
			self.rerender();
      self.actions.updateRepo();
      window.location.reload();
    },

    updateRepo() {
      let repo = (localStorage.currentStore || "http://localhost:8090/rdf4j/repositories")
        + globals.servicesRepository;
      actions.saveGraph(globals.ajax, repo);
    }
	},

	willDestroyElement() {
		this._super(...arguments);
	}
}); // end Ember export

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

function loadRdfGraphData() {
	let repo = (localStorage.currentStore || "http://localhost:8090/rdf4j/repositories")
            + globals.servicesRepository;
	actions.getFromServer(ajax, repo).then(rdfDataHasLoaded);
}

function rdfDataHasLoaded(rdfData) {
	rdfGraph.reset();
  rdfGraph.set(rdfData);
  let actionList = actions.getActions();
	self.set("availableServices", actionList.services);
	if (actionList.services.length > 0) {
		self.actions.setActiveService(actionList.services[0]);
	}
	self.set("availablePlugins", actionList.plugins);
}

function setTriplestoreField() {
	$(".store-url").text(localStorage.currentStore);
}
