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
import config from "./config/environment";
import Ember from "ember";

const Router = Ember.Router.extend({
  location: config.locationType,
  rootURL: config.rootURL,
});

Router.map(function () {
  this.route("about");
  this.route("editor", function () {
    this.route("agents", function () {
      this.route("template", { path: "/" });
      this.route("template");
      this.route("instance");
    });

    this.route("behaviors");
    this.route("services", function () {
      this.route("actions", { path: "/" });
      this.route("actions");
      this.route("service");
      this.route("demo");
      this.route("carjan");
    });
    this.route("domain", function () {
      this.route("domain-view", { path: "/" });
      this.route("domain-view");
    });
    this.route("queries");
    this.route("definitions", function () {
      this.route("overview", { path: "/" });
      this.route("overview");
      this.route("vocabulary");
      this.route("snippets");
      this.route("templates");
      this.route("queries");
      this.route("test");
    });
  });
  this.route("home");
});

export default Router;
