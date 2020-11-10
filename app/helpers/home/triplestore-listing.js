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
import htmlGen from "ajan-editor/helpers/home/html-generator";

let $ = Ember.$;

class TriplestoreListing {
	constructor(triplestore, parentComponent) {
		this.triplestore = triplestore;
		this.parentComponent = parentComponent;

		this.initiate();
	}

	initiate() {
		this.createFields();
		this.setAuxiliaryFields();
		this.attachFields();
		this.bindEvents();
	}

	createFields() {
		this.$wrapper = htmlGen.listingWrapper(this.triplestore);
		this.$label = htmlGen.divLabel(this.triplestore);
		this.$uri = htmlGen.divURI(this.triplestore);
		this.$buttons = htmlGen.buttons();
	}

	setAuxiliaryFields() {
		this.$parent = $("#triplestore-list");
		this.$removeButton = this.$buttons.children(".triplestore-remove");
		this.$editButton = this.$buttons.children(".triplestore-edit");
		this.$editButtonContent = this.$editButton.children();
	}

	attachFields() {
		this.$wrapper.append(this.$label, this.$uri, this.$buttons);
		this.$parent.append(this.$wrapper);
	}

	bindEvents() {
		this.bindTransitionEvent();
		this.bindRemoveTriplestoreEvent();
		this.bindEditClickEvent();
	}

	bindTransitionEvent() {
		this.$wrapper.off("click").click(event => this.transitionEvent(event));
	}

	transitionEvent(event) {
		let target = $(event.target);
		//TODO: return if div is in edit mode
		if (target.is("input")) return;
		localStorage.currentStore = this.$uri[0].innerText;
		this.parentComponent.sendAction("transitionToEditorBehavior");
	}

	bindRemoveTriplestoreEvent() {
		this.$removeButton.off("click").click(event => {
			event.stopPropagation();
			this.removeTriplestore();
		});
	}

	removeTriplestore() {
		this.removeStorageEntry();
		this.removeListing();
	}

	removeStorageEntry() {
		let {
			triplestores,
			triplestoreIndex
		} = this.findMatchingTriplestoreInStorage();
		if (triplestoreIndex > -1) triplestores.splice(triplestoreIndex, 1);
		localStorage.triplestores = JSON.stringify(triplestores);
	}

	removeListing() {
		this.$wrapper.remove();
	}

	bindEditClickEvent() {
		this.setInputFields();
		this.$editButton.off("click").click(event => this.editClickEvent(event));
	}

	setInputFields() {
		this.$inputLabel = htmlGen.inputLabel(this.triplestore);
		this.$inputURI = htmlGen.inputURI(this.triplestore);
	}

	editClickEvent(event) {
		event.stopPropagation();
		this.toggleEditButtonClasses();
		this.switchEditModeState();
	}

	switchEditModeState() {
		if (this.$editButtonContent.hasClass("check")) {
			this.enableEditMode();
		} else {
			this.disableEditMode();
		}
	}

	toggleEditButtonClasses() {
		this.$editButton.toggleClass("yellow positive");
		this.$editButtonContent.toggleClass("check setting");
	}

	enableEditMode() {
		this.setInputFields();
		this.$label.empty().append(this.$inputLabel);
		this.$uri.empty().append(this.$inputURI);
		this.bindInputEnter(this.$inputLabel);
		this.bindInputEnter(this.$inputURI);
	}

	bindInputEnter($input) {
		$input.keypress(e => {
			// Pressed Enter
			if (e.which == 13) this.editClickEvent(e);
		});
	}

	disableEditMode() {
		this.updateTriplestore();
		this.$label.empty().text(this.triplestore.label);
		this.$uri.empty().text(this.triplestore.uri);
	}

	updateTriplestore() {
		let newLabel = this.$inputLabel.val();
		let newUri = fixUri(this.$inputURI.val());
		if (this.triplestoreValuesChanged(newLabel, newUri)) {
			let {
				triplestores,
				triplestoreIndex
			} = this.findMatchingTriplestoreInStorage();
			this.updateThisTriplestore(newLabel, newUri);
			this.updateStorageTriplestore(triplestores, triplestoreIndex);
		}
	}

	triplestoreValuesChanged(newLabel, newUri) {
		return (
			newUri !== this.triplestore.uri || newLabel !== this.triplestore.label
		);
	}

	updateThisTriplestore(newLabel, newUri) {
		this.triplestore.uri = newUri;
		this.triplestore.label = newLabel;
	}

	findMatchingTriplestoreInStorage() {
		let triplestores = JSON.parse(localStorage.triplestores) || [];
		let triplestoreIndex = triplestores.findIndex(store => {
			return (
				store.label === this.triplestore.label &&
				store.uri === this.triplestore.uri
			);
		});
		if (triplestoreIndex < 0) console.warn("Could not find", this.triplestore);
		return {triplestores, triplestoreIndex};
	}

	updateStorageTriplestore(triplestores, triplestoreIndex) {
		triplestores[triplestoreIndex] = this.triplestore;
		localStorage.triplestores = JSON.stringify(triplestores);
	}
}

function fixUri(uri) {
	let regexHttp = RegExp("^http://");
	let regexHttps = RegExp("^https://");
	return (regexHttp.test(uri) || regexHttps.test(uri)) ? uri : "http://" + uri;
}

export {TriplestoreListing};
