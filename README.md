# AJAN-editor

This is the web editor to create and run agents with the AJAN-service.

## Prerequisites

You will need the following things properly installed on your computer.

* [Git](https://git-scm.com/)
* [Node.js (Version 8.6!)](https://nodejs.org/download/release/v8.6.0/) then cmd: >> `npm install`
* [Google Chrome](https://google.com/chrome/)

## Installation

### Prebuild Installation
* [Download latest release ZIP](https://github.com/aantakli/AJAN-editor/releases)
* Run `startALL.bat` if you are on Windows and `startALL.sh` if you are on Mac/Linux

### Clean Installation
* `git clone <repository-url>` this repository
* `cd AJAN-editor`
* `npm install`

### Docker
* [Download latest Docker-Image](https://hub.docker.com/r/aantakli/ajan-editor)
* Read Docker [Wiki](https://github.com/aantakli/AJAN-editor/wiki/Docker)

## Running / Development

* cmd: `node npm/node_modules/ember-cli/bin/ember serve` or run `startEditor.bat`
* Visit your app at [http://localhost:4200](http://localhost:4200).

## Interaction with AJAN-service

After the AJAN-editor is prepared, interaction with the AJAN-service is now possible. For this, however, the AJAN-service must run with its triplestore. If this is the case, please open `http://localhost:4200/home` and follow the next steps:

* Choose new Triplestore, and define a `Triplestore Name`
* Now define the AJAN-service Triplestore URI. By default `http://localhost:8090/rdf4j/repositories/`
* After clicking `Add`, the newly created location can be opend via `Choose existing Triplestore`

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
