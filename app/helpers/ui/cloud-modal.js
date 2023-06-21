/*
 * Created on Tue Nov 10 2020
 *
 * The MIT License (MIT)
 * Copyright (c) 2020 André Antakli, Xueting Li (German Research Center for Artificial Intelligence, DFKI).
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

let callback = null;
let elem = null;
let url = "https://api.github.com/repos/aantakli/AJAN-packages/contents/packages/";
let packages;
let $packages;

export default {
  createCloudModal: createCloudModal
};

function createCloudModal(callbackFunct) {
  callback = callbackFunct;
  packages = [];
  console.log("Get AJAN Packages");
  $("#modal-header-title").text("Import AJAN-packages");
  let $body = $("#modal-body"),
    $modal = $("#universal-modal");
  $body.addClass("cloud-modal");
  $body.empty();
  getURL($body);
  $modal.show();

  // Listen for the confirm event
  elem = document.getElementById("universal-modal");
  elem.addEventListener("modal:confirm", onConfirm);
  elem.addEventListener("modal:cancel", onCancel);
}

function onConfirm() {
  var ele = document.getElementsByName('packages');
  let file = null;
  for (let i = 0; i < ele.length; i++) {
    if (ele[i].checked) {
      file = packages.filter(item => item.id == ele[i].id);
    }
  }
  $packages.empty();
  elem.removeEventListener("modal:confirm", onConfirm);
  callback(file);
}

function onCancel() {
  $packages.empty();
  elem.removeEventListener("modal:confirm", onConfirm);
  elem.removeEventListener("modal:cancel", onCancel);
}

function getURL($body) {
  let $info = $("<div>", {});
  $info.append($("<h2>Packages Location</h2>"));
  let $url = $("<div class='ui input' ><input class='ember-text-field cloud-url' value='" + url + "'\ ></div>");
  let $button = $("<button class='ui icon button'><i class='sync icon'></i></button>");
  $info.append($("<div>", {
    class: "modal-p"
  }).append("<b>URL:</b> ")
    .append($url)
    .append($button));

  $button.off("click").click(event => getGitPackages(event, $url));

  $packages = $('<div class="available-packages">');
  $info.append($packages);

  let $infoDiv = $("<div>", {
    class: "modal-body-div"
  }).append($info);
  // Append to modal body
  $body.append($infoDiv);
}


function getGitPackages(event, $url) {
  packages = [];
  $packages.empty();
  $packages.append($("<h2>Available Packages</h2>"));
  $.ajax({
    url: $url.children('input').val(),
    type: "GET",
    accept: "application/json; charset=utf-8"
  }).then(function (data) {
    data.forEach(file => {
      let zip = async () => {
        if (file.name.endsWith(".zip")) {
          let url = file.download_url;
          let response = await fetch(url);
          const blob = await response.blob();
          packages.push({ id: file.name, zip: blob });
          $packages.append(createRepoCheckbox(file, blob));
        }
      }
      zip();
    })
  });
}

function createRepoCheckbox(file) {
  return $('<input class="ajan-package" type="radio" id="' + file.name + '" name="packages""><label for="' + file.name + '">' + file.name + '</label><br>');
}
