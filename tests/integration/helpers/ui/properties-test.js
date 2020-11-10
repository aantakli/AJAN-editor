import {moduleForComponent, test} from "ember-qunit";
import hbs from "htmlbars-inline-precompile";

moduleForComponent("ui/properties", "helper:ui/properties", {
	integration: true
});

// Replace this with your real tests.
test("it renders", function(assert) {
	this.set("inputValue", "1234");

	this.render(hbs`{{ui/properties inputValue}}`);

	assert.equal(
		this.$()
			.text()
			.trim(),
		"1234"
	);
});
