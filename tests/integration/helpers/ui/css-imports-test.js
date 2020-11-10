import {moduleForComponent, test} from "ember-qunit";
import hbs from "htmlbars-inline-precompile";

moduleForComponent("ui/css-imports", "helper:ui/css-imports", {
	integration: true
});

// Replace this with your real tests.
test("it renders", function(assert) {
	this.set("inputValue", "1234");

	this.render(hbs`{{ui/css-imports inputValue}}`);

	assert.equal(
		this.$()
			.text()
			.trim(),
		"1234"
	);
});
