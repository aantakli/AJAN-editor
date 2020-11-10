import {module, test} from "qunit";
import {setupTest} from "ember-qunit";

module("Unit | Route | editor/definitions/overview", function(hooks) {
	setupTest(hooks);

	test("it exists", function(assert) {
		let route = this.owner.lookup("route:editor/definitions/overview");
		assert.ok(route);
	});
});
