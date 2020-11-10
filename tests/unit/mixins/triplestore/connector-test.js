import {module, test} from 'qunit';
import EmberObject from '@ember/object';
import TriplestoreConnectorMixin from 'ajan-editor/mixins/triplestore/connector';

module('Unit | Mixin | triplestore/connector', function() {
	// Replace this with your real tests.
	test('it works', function(assert) {
		let TriplestoreConnectorObject = EmberObject.extend(TriplestoreConnectorMixin);
		let subject = TriplestoreConnectorObject.create();
		assert.ok(subject);
	});
});
