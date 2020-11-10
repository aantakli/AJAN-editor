import {module, test} from "qunit";
import {setupTest} from "ember-qunit";

module("Unit | Route | editor/definitions/queries", function(hooks) {
	setupTest(hooks);

	test("it exists", function(assert) {
		let route = this.owner.lookup("route:editor/definitions/queries");
		assert.ok(route);
	});
});
