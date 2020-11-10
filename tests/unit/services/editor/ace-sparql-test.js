import { module, test } from 'qunit';
import { setupTest } from 'ember-qunit';

module('Unit | Service | editor/ace-sparql', function(hooks) {
  setupTest(hooks);

  // Replace this with your real tests.
  test('it exists', function(assert) {
    let service = this.owner.lookup('service:editor/ace-sparql');
    assert.ok(service);
  });
});

