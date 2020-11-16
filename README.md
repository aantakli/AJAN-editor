# AJAN-editor

This is the web editor to create and run agents with the AJAN service.

## Prerequisites

You will need the following things properly installed on your computer.

* [Git](https://git-scm.com/)
* [Node.js (Version 8.6!)](https://nodejs.org/download/release/v8.6.0/) then cmd: >> `npm install`
* [Ember CLI](https://ember-cli.com/) then cmd: >> `npm install -g ember-cli`
* [Bower](https://bower.io/) then cmd: >> `npm install -g bower`
* [Google Chrome](https://google.com/chrome/)

## Installation

* `git clone <repository-url>` this repository
* `cd AJAN-editor`
* `npm install`

## Running / Development

* `ember serve`
* Visit your app at [http://localhost:4200](http://localhost:4200).

## Interaction with AJAN-service

The AJAN-editor needs several repositories to store editor data and to load node definitions. Especially the node definitions are necessary to interpret and display an AJAN Behavior Tree correctly. To create these repositories, start the triplestore provided with the AJAN service and create two new repositories.

To do this, open the RDF4J Workbench (http://localhost:8090/workbench/repositories by default) and follow the steps below:

* create Node Definitions repository:
-> open `New Repository`
-> select Type: `Native Store` and click `Next`
-> specify Id: `node_definitions` and click `Create`
* Load Node Definitions
-> select the newly created repository and open the `Add` dialog
-> unselect `use base URI as context identifier`
-> load RDF Data File: `<AJAN-editor Root Folder>/Triplestore Repos/node_definitions.ttl`

Now do the same with the Editor Data Repository:

* create Node Definitions repository:
-> open `New Repository`
-> select Type: `Native Store` and click `Next`
-> specify Id: `editor_data` and click `Create`
* Load Node Definitions
-> select the newly created repository and open the `Add` dialog
-> unselect `use base URI as context identifier`
-> load RDF Data File: `<AJAN-editor Root Folder>/Triplestore Repos/editor_data.trig`

### Code Generators

Make use of the many generators for code, try `ember help generate` for more details

## Importing npm packages

If you have trouble importing some packages from npm, try this:
http://www.jimmylauzau.com/blog/2016/03/22/importing-node-modules-in-ember-js

### Running Tests

* `ember test`
* `ember test --server`

### Building

* `ember build` (development)
* `ember build --environment production` (production)

### Deploying

Specify what it takes to deploy your app.

## Further Reading / Useful Links

* [ember.js](https://emberjs.com/)
* [ember-cli](https://ember-cli.com/)
* Development Browser Extensions
  * [ember inspector for chrome](https://chrome.google.com/webstore/detail/ember-inspector/bmdblncegkenkacieihfhpjfppoconhi)
  * [ember inspector for firefox](https://addons.mozilla.org/en-US/firefox/addon/ember-inspector/)
