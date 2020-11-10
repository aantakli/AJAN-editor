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
let $ = Ember.$;

// Requires the modal-creation component
class ModalManager {
	constructor(empty = true) {
		this.$body = $("#modal-body");
		this.$modal = $("#modal");
		this.$saveButton = $("#save-button");

		if (empty) this.$body.empty();
	}

	setTitle(title) {
		$("#modal-header-title").text(title);
	}

  get(field) {
    return $("#" + field + "-input").val();
  }

	bindOpenButton($button) {
		$button.off("click").click(() => {
			this.$modal.show();
		});
	}

  show() {
		this.$modal.show();
	}

  bindSaveButton(callback) {
    this.$saveButton.off("click").click(callback);
  }

	appendTextarea(label, value, placeholder) {
		let textareaDiv = getTextareaDiv(label, value, placeholder);
		this.$body.append(textareaDiv);
	}

	appendInput(label, value, placeholder) {
		let textareaDiv = getInputDiv(label, value, placeholder);
		this.$body.append(textareaDiv);
	}
}

function getTextareaDiv(label, value, placeholder) {
	let $label = getLabel(label);
	let $input = getTextarea(label, value, placeholder);
	let $wrapper = getWrapper().append($label, $input);

	return $wrapper;
}

function getInputDiv(label, value, placeholder) {
	let $label = getLabel(label);
	let $input = getInput(label, value, placeholder);
	let $wrapper = getWrapper().append($label, $input);

	return $wrapper;
}

function getLabel(label) {
	return $("<p>", {
		class: "modal-p modal-flex-item"
	}).text(label + ": ");
}

function getInput(label, value, placeholder) {
	return $("<input>", {
		class: "modal-creation-input modal-flex-item",
		id: label + "-input",
		placeholder: placeholder,
		value: value
	});
}

function getTextarea(label, value, placeholder) {
	return $("<textarea>", {
		class: "modal-creation-textarea modal-flex-item",
		id: label + "-input",
		placeholder: placeholder,
		text: value
	});
}

function getWrapper() {
	return $("<div>", {
		class: "modal-body-component flex-container"
	});
}

export {ModalManager};
