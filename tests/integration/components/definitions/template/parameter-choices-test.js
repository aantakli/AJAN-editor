import {module, test} from "qunit";
import hbs from "htmlbars-inline-precompile";
import {render} from "@ember/test-helpers";
import {setupRenderingTest} from "ember-qunit";

module(
	"Integration | Component | definitions/template/parameter-choices",
	function(hooks) {
		setupRenderingTest(hooks);

		test("it renders", async function(assert) {
			// Set any properties with this.set('myProperty', 'value');
			// Handle any actions with this.set('myAction', function(val) { ... });

			await render(hbs`{{definitions/template/parameter-choices}}`);

			assert.equal(this.element.textContent.trim(), "");

			// Template block usage:
			await render(hbs`
      {{#definitions/template/parameter-choices}}
        template block text
      {{/definitions/template/parameter-choices}}
    `);

			assert.equal(this.element.textContent.trim(), "template block text");
		});
	}
);
