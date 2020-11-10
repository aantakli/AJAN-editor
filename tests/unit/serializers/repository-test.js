import {module, test} from "qunit";
import {run} from "@ember/runloop";
import {setupTest} from "ember-qunit";

module("Unit | Serializer | repository", function(hooks) {
	setupTest(hooks);

	// Replace this with your real tests.
	test("it exists", function(assert) {
		let store = this.owner.lookup("service:store");
		let serializer = store.serializerFor("repository");

		assert.ok(serializer);
	});

	test("it serializes records", function(assert) {
		let store = this.owner.lookup("service:store");
		let record = run(() => store.createRecord("repository", {}));

		let serializedRecord = record.serialize();

		assert.ok(serializedRecord);
	});
});
