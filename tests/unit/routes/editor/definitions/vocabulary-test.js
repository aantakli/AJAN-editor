import {module, test} from "qunit";
import {setupTest} from "ember-qunit";

module("Unit | Route | editor/definitions/vocabulary", function(hooks) {
	setupTest(hooks);

	test("it exists", function(assert) {
		let route = this.owner.lookup("route:editor/definitions/vocabulary");
		assert.ok(route);
	});
});
