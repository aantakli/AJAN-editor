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

// Use Ember's instance of jQuery
let $ = Ember.$;
let $modal;

export default Ember.Component.extend({
	// After the element has been inserted into the DOM
	didInsertElement() {
		this._super(...arguments);

		let idString = "#" + this.get("modalID");
		$modal = $(idString);

		let that = this;
		// When the user clicks anywhere outside of the modal, close it
		$modal.off("click").click(event => {
			$modal = $(idString);
			if (event.target == $modal[0]) {
				that.send("close");
			}
		});
	}, // end didInsertElement

	// ******************** Declare actions ********************
	// actions used in the .hbs file
	actions: {
		close: function() {
			this.set("show", false);
		},

		confirm: function() {
			// Close modal
			// this.set("show", false);

			if (this.onConfirm()) {
				this.set("show", false);
			}
		},

		cancel: function() {
			this.set("show", false);
		}
	}
}); //end Ember export
