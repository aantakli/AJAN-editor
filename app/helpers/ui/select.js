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

function initiateSelect() {
	$(".select-selected").remove();
	$(".select-items").remove();
	initiateCustomSelects();
	// Close all the boxes when clicking outside the box
	document.addEventListener("click", closeAllSelect);
}

function initiateCustomSelects() {
	let $customSelects = $(".custom-select");
	$customSelects.each(initiateCustomSelect);
}

function initiateCustomSelect() {
	let $selEle = $(this).children("select");
	// div acting as select
	let $divSel = $("<div>", {
		class: "select-selected"
	});
	$divSel.html($selEle.find(":selected").html());
	$(this).append($divSel);
	// div acting as option container
	let $divOptCon = $("<div>", {
		class: "select-items select-hide"
	});
	let $optEles = $selEle.children("option");

	createOptReplacements($divOptCon, $optEles, $selEle, $divSel);
	$(this).append($divOptCon);
	$divSel.click(selectClick);
}

function createOptReplacements($divOptCon, $optEles, $selEle, $divSel) {
	$optEles.each(function() {
		// div acting as option
		let $divOpt = $("<div>", {
			class: ""
		});
		$divOpt.html($(this).html());
		$divOpt.on(
			"click",
			{
				$optEles,
				$selEle,
				$divSel
			},
			updateSelection
		);
		$divOptCon.append($divOpt);
	});
}

function updateSelection(e) {
	// On click, update the original select box, and the current selection
	let data = e.data;
	let $divOpt = $(this);

	data.$optEles.each(function(i) {
		let $currentEle = $(this);
		if ($currentEle.html() === $divOpt.html()) {
			data.$selEle.prop("selectedIndex", i);
			data.$divSel.html($divOpt.html());
			let ss = $divOpt.parent().children(".same-as-selected");
			ss.each(function() {
				$divOpt.removeAttr("class");
			});
			$divOpt.attr("class", "same-as-selected");
			return false;
		}
	});
	data.$divSel.click();
	// Trigger events on original select
	data.$selEle.click();
	data.$selEle.trigger("change");
}

function selectClick(e) {
	// Close other select boxes and toggle current one
	e.stopPropagation();
	closeAllSelect(this);
	this.nextSibling.classList.toggle("select-hide");
	this.classList.toggle("select-arrow-active");
}

function closeAllSelect(elmnt) {
	// Close all select boxes, except the current one
	let arrNo = [];
	let $items = $(".select-items");
	let $selected = $(".select-selected");

	$selected.each(function(i) {
		if (elmnt == this) arrNo.push(i);
		else $(this).removeClass("select-arrow-active");
	});
	$items.each(function(i) {
		if (arrNo.indexOf(i)) $(this).addClass("select-hide");
	});
}

export {initiateSelect};
