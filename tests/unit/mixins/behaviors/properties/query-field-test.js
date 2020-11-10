import {module, test} from "qunit";
import BehaviorsPropertiesQueryFieldMixin from "ajan-editor/mixins/behaviors/properties/query-field";
import EmberObject from "@ember/object";

module("Unit | Mixin | behaviors/properties/query-field", function() {
	// Replace this with your real tests.
	test("it works", function(assert) {
		let BehaviorsPropertiesQueryFieldObject = EmberObject.extend(
			BehaviorsPropertiesQueryFieldMixin
		);
		let subject = BehaviorsPropertiesQueryFieldObject.create();
		assert.ok(subject);
	});
});
