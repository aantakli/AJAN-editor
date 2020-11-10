import {module, test} from "qunit";
import hbs from "htmlbars-inline-precompile";
import {render} from "@ember/test-helpers";
import {setupRenderingTest} from "ember-qunit";

module("Integration | Helper | visibility-property", function(hooks) {
	setupRenderingTest(hooks);

	// Replace this with your real tests.
	test("it renders", async function(assert) {
		this.set("inputValue", "1234");

		await render(hbs`{{visibility-property inputValue}}`);

		assert.equal(this.element.textContent.trim(), "1234");
	});
});
