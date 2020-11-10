import {module, test} from "qunit";
import {setupTest} from "ember-qunit";

module("Unit | Route | editor/definitions/templates", function(hooks) {
	setupTest(hooks);

	test("it exists", function(assert) {
		let route = this.owner.lookup("route:editor/definitions/templates");
		assert.ok(route);
	});
});
