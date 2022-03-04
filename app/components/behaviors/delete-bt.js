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
let that;

export default Ember.Component.extend({
  dataBus: Ember.inject.service(),

  init() {
    this._super(...arguments);
    that = this;
    this.get('dataBus').on('deleteBTModal', function () {
      console.log("delete-BT: deleteBT");
      deleteModal();
    });
  },
}); 

function deleteModal() {
  console.log("Delete a Behavior Tree");
  $("#modal-header-title").text("Delete SPARQL Behavior Tree");
  let $body = $("#modal-body"),
    $modal = $("#universal-modal");
  $body.empty();
  $modal.show();

  let $question = $("<h3 style='color: red'>", {
    class: "modal-p"
  }).text("Do your really want to delete this Behavior Tree?");
  let $input = $("<div>", {
    class: "modal-body-div"
  }).append($question);

  // Append to modal body
  $body.append($input);

  // Listen for the confirm event
  let elem = document.getElementById("universal-modal");
  elem.addEventListener("modal:confirm", () => {
    that.dataBus.deleteBT();
  });
}
