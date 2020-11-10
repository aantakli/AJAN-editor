import {moduleForComponent, test} from "ember-qunit";
import hbs from "htmlbars-inline-precompile";

moduleForComponent("select-store", "Integration | Component | select store", {
	integration: true
});

test("it renders", function(assert) {
	// Set any properties with this.set('myProperty', 'value');
	// Handle any actions with this.on('myAction', function(val) { ... });

	this.render(hbs`{{select-store}}`);

	assert.equal(
		this.$()
			.text()
			.trim(),
		""
	);

	// Template block usage:
	this.render(hbs`
    {{#select-store}}
      template block text
    {{/select-store}}
  `);

	assert.equal(
		this.$()
			.text()
			.trim(),
		"template block text"
	);
});
