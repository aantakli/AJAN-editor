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

let $ = Ember.$;

export default {
	buttons,
	divLabel,
	divURI,
	inputLabel,
	inputURI,
	listingWrapper
};

function inputLabel(triplestore) {
	return $(`<input placeholder="Triplestore Name" value=${triplestore.label}>`);
}

function inputURI(triplestore) {
	return $(`<input placeholder="URI" value=${triplestore.uri}>`);
}

function listingWrapper(triplestore) {
	return $("<div>", {
		class: "triplestore-listing cf clickable",
		id: triplestore.label + "_" + triplestore.uri
	});
}

function divLabel(triplestore) {
	return $("<div>", {
		class: "blocks input label"
	}).text(triplestore.label);
}

function divURI(triplestore) {
	return $("<div>", {
		class: "blocks input uri"
	}).text(triplestore.uri);
}

function buttonRemove() {
	return $(
		'<div class="triplestore-remove ui negative icon button"><i class="delete icon"></i></div>'
	);
}

function buttonEdit() {
	return $('<div class="triplestore-edit ui yellow icon button"></div>').append(
		$('<i class="setting icon"></i>')
	);
}

function buttonImport() {
  return $('<div class="triplestore-import ui grey icon button"></div>').append(
    $('<input class="upload icon" type="file" accept=".zip" value="">')
  );
}

function buttons() {
	return $("<div>", {
		class: "blocks btn right"
  }).append(buttonImport(), buttonEdit(), buttonRemove());
}
