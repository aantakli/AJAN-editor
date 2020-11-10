import {moduleForComponent, test} from "ember-qunit";
import hbs from "htmlbars-inline-precompile";

moduleForComponent("ui/global", "helper:ui/global", {
	integration: true
});

// Replace this with your real tests.
test("it renders", function(assert) {
	this.set("inputValue", "1234");

	this.render(hbs`{{ui/global inputValue}}`);

	assert.equal(
		this.$()
			.text()
			.trim(),
		"1234"
	);
});
