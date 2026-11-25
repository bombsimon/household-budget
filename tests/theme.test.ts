import assert from 'node:assert/strict';
import test from 'node:test';
import { parseThemePreference, resolveTheme } from '../src/utils/theme.ts';

test('a missing or unknown stored theme follows the system', () => {
  assert.equal(parseThemePreference(null), 'system');
  assert.equal(parseThemePreference('purple'), 'system');
  assert.equal(parseThemePreference('dark'), 'dark');
});

test('an explicit theme overrides the system', () => {
  assert.equal(resolveTheme('system', true), 'dark');
  assert.equal(resolveTheme('system', false), 'light');
  assert.equal(resolveTheme('light', true), 'light');
  assert.equal(resolveTheme('dark', false), 'dark');
});
