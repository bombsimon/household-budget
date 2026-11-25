import assert from 'node:assert/strict';
import test from 'node:test';
import { assignToColumns } from '../src/utils/assignToColumns.ts';

test('each item goes in the column that is shortest so far', () => {
  assert.deepEqual(assignToColumns([6, 4, 9, 23, 8, 6]), [
    'left',
    'right',
    'right',
    'left',
    'right',
    'right',
  ]);
});

test('equal columns fill from the left', () => {
  assert.deepEqual(assignToColumns([]), []);
  assert.deepEqual(assignToColumns([5, 5, 5]), ['left', 'right', 'left']);
});
