/* eslint-env node */
"use strict";

module.exports = function(environment) {
	let ENV = {
		modulePrefix: "ajan-editor",
		environment,
		rootURL: "/",
		locationType: "auto",
		EmberENV: {
			FEATURES: {
				// Here you can enable experimental features on an ember canary build
				// e.g. 'with-controller': true
        "jquery-integration": true//added by ding using jQuery
			},
			EXTEND_PROTOTYPES: {
				// Prevent Ember Data from overriding Date.parse.
				Date: false
			}
		},

		APP: {
			// Here you can pass flags/options to your application instance
			// when it is created
		},
    VERSION: process.env.VERSION
	};

	if (environment === "development") {
		// ENV.APP.LOG_RESOLVER = true;
		// ENV.APP.LOG_ACTIVE_GENERATION = true;
		// ENV.APP.LOG_TRANSITIONS = true;
		// ENV.APP.LOG_TRANSITIONS_INTERNAL = true;
		// ENV.APP.LOG_VIEW_LOOKUPS = true;
		ENV["ember-cli-mirage"] = {
			enabled: false
		};
	}

	if (environment === "test") {
		// Testem prefers this...
		ENV.locationType = "none";

		// keep test console output quieter
		ENV.APP.LOG_ACTIVE_GENERATION = false;
		ENV.APP.LOG_VIEW_LOOKUPS = false;

		ENV.APP.rootElement = "#ember-testing";
	}

	if (environment === "production") {
		ENV["ember-cli-mirage"] = {
			enabled: false
		};
	}

	return ENV;
};
