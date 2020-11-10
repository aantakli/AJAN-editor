import EmberObject from '@ember/object';
import TableSortableMixin from 'ajan-editor/mixins/table/sortable';
import { module, test } from 'qunit';

module('Unit | Mixin | table/sortable', function() {
  // Replace this with your real tests.
  test('it works', function (assert) {
    let TableSortableObject = EmberObject.extend(TableSortableMixin);
    let subject = TableSortableObject.create();
    assert.ok(subject);
  });
});
