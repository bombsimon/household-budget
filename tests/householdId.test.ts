import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeHouseholdId } from '../src/utils/householdId.ts';

test('IDs differing only in case or separators are the same household', () => {
  assert.equal(normalizeHouseholdId('Home'), 'home');
  assert.equal(normalizeHouseholdId('Smith_Family'), 'smith-family');
});

test('an ID with nothing usable becomes empty', () => {
  assert.equal(normalizeHouseholdId('___'), '');
});
