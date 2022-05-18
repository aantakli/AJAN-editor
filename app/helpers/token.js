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

import Ember from "ember";

let $ = Ember.$;

export default {
  resolveToken: function (ajax, tripleStoreRepository) {
    return getToken(ajax, tripleStoreRepository);
  }
};

function getToken(ajax, tripleStoreRepository) {
  let token;
  let repos = JSON.parse(localStorage.triplestores);
  repos.forEach(repo => {
    if (repo.uri == tripleStoreRepository) {
      if (repo.secured) {
        if (!repo.token || repo.token == "" || !repo.expiration || repo.expiration < Date.now()) {
          token = createLoginModal(ajax, repos, repo, tripleStoreRepository);
        }
        else {
          token = repo.token;
        }
      }
      else {
        token = undefined;
      }
    }
  });
  return token;
}

function createLoginModal(ajax, repos, repo, tripleStoreRepository) {
  $("#modal-header-title").text("Repository Login");
  let $body = $("#modal-body"),
    $modal = $("#universal-modal");
  $body.empty();
  $modal.show();

  // Credentials
  let $credentialsTitle = $("<p>", {
    class: "modal-p"
  }).text("User Credentials for: " + tripleStoreRepository);
  let $userInput = $("<input>", {
    class: "modal-input",
    id: "user-input",
    placeholder: "User",
  });

  let $roleInput = $("<input>", {
    class: "modal-input",
    id: "role-input",
    placeholder: "Role",
  });
  let $pswdLabel = $("<span>", {}).text("Password: ");
  let $pswdInput = $("<input type='password' id='pswd-input'>", {});
  let $credentialsDiv = $("<div>", {
    class: "modal-body-div"
  }).append($credentialsTitle, $userInput, $roleInput, $pswdLabel, $pswdInput);
  // Append to modal body
  $body.append($credentialsDiv);

  // Listen for the confirm event
  let elem = document.getElementById("universal-modal");
  return new Promise((resolve, reject) => {
    elem.addEventListener("modal:confirm", function () {
      resolve(requestToken(ajax, repos, repo, tripleStoreRepository,
        $("#user-input").val(),
        $("#role-input").val(),
        $("#pswd-input").val())
      );
    });
  });
}

function requestToken(ajax, repos, repo, tripleStoreRepository, user, role, pswd) {
  return ajax.raw("http://localhost:8090/tokenizer/token?userId=" + user + "&role=" + role + "&pswd=" + pswd + "", { type: "GET" })
    .then(function (data) {
      repo.token = data.payload.token;
      repo.expiration = Date.now() + (data.payload.expirySecs * 1000);
      localStorage.triplestores = JSON.stringify(repos);
      return repo.token;
    });
}
