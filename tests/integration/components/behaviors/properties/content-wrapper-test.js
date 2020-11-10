import {module, test} from "qunit";
import hbs from "htmlbars-inline-precompile";
import {render} from "@ember/test-helpers";
import {setupRenderingTest} from "ember-qunit";

module(
	"Integration | Component | behaviors/properties/content-wrapper",
	function(hooks) {
		setupRenderingTest(hooks);

		test("it renders", async function(assert) {
			// Set any properties with this.set('myProperty', 'value');
			// Handle any actions with this.set('myAction', function(val) { ... });

			await render(hbs`{{behaviors/properties/content-wrapper}}`);

			assert.equal(this.element.textContent.trim(), "");

			// Template block usage:
			await render(hbs`
      {{#behaviors/properties/content-wrapper}}
        template block text
      {{/behaviors/properties/content-wrapper}}
    `);

			assert.equal(this.element.textContent.trim(), "template block text");
		});
	}
);
