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
import Ember from "ember";
//import UiModal from 'semantic-ui-ember/components/ui-modal';

let $ = Ember.$;

export default Ember.Route.extend({
	model() {
		// Return a promise to both data sets
		/*return Ember.RSVP.hash({
      nodes: this.store.findAll('behaviors/node'),
      edges: this.store.findAll('behaviors/edge')
    });*/
	},

	actions: {
		/******** Actions related to the modal pop up *****/
		// Open and initiate the modal
		openHelp: function() {
			let modal = $(".ui.editorHelp.modal");
			modal.modal({
				observeChanges: true
			});
			modal.modal("show");
			modal.css("top", "5vh");
		},

		// Close the modal
		closeModal: function() {
			$(".ui.editorHelp.modal").modal("hide");
		}
	}
});
