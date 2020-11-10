import {module, test} from "qunit";
import hbs from "htmlbars-inline-precompile";
import {render} from "@ember/test-helpers";
import {setupRenderingTest} from "ember-qunit";

module(
	"Integration | Component | definitions/vocabulary/vocabulary-modal",
	function(hooks) {
		setupRenderingTest(hooks);

		test("it renders", async function(assert) {
			// Set any properties with this.set('myProperty', 'value');
			// Handle any actions with this.set('myAction', function(val) { ... });

			await render(hbs`{{definitions/vocabulary/vocabulary-modal}}`);

			assert.equal(this.element.textContent.trim(), "");

			// Template block usage:
			await render(hbs`
      {{#definitions/vocabulary/vocabulary-modal}}
        template block text
      {{/definitions/vocabulary/vocabulary-modal}}
    `);

			assert.equal(this.element.textContent.trim(), "template block text");
		});
	}
);
