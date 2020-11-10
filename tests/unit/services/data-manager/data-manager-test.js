import { module, test } from 'qunit';
import { setupTest } from 'ember-qunit';

module('Unit | Service | data-manager/data-manager', function(hooks) {
  setupTest(hooks);

  // Replace this with your real tests.
  test('it exists', function(assert) {
    let service = this.owner.lookup('service:data-manager/data-manager');
    assert.ok(service);
  });
});

