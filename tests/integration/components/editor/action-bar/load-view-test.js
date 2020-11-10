import {module, test} from "qunit";
import hbs from "htmlbars-inline-precompile";
import {render} from "@ember/test-helpers";
import {setupRenderingTest} from "ember-qunit";

module("Integration | Component | editor/action-bar/load-view", function(
	hooks
) {
	setupRenderingTest(hooks);

	test("it renders", async function(assert) {
		// Set any properties with this.set('myProperty', 'value');
		// Handle any actions with this.set('myAction', function(val) { ... });

		await render(hbs`{{editor/action-bar/load-view}}`);

		assert.equal(this.element.textContent.trim(), "");

		// Template block usage:
		await render(hbs`
      {{#editor/action-bar/load-view}}
        template block text
      {{/editor/action-bar/load-view}}
    `);

		assert.equal(this.element.textContent.trim(), "template block text");
	});
});
