import {module, test} from "qunit";
import {setupTest} from "ember-qunit";

module("Unit | Route | editor/queries", function(hooks) {
	setupTest(hooks);

	test("it exists", function(assert) {
		let route = this.owner.lookup("route:editor/queries");
		assert.ok(route);
	});
});
