import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { findTaxFromTable, parseTaxTableCSV } from '../src/utils/csvParser.ts';

const rows = parseTaxTableCSV(
  readFileSync(new URL('../public/tax_table.csv', import.meta.url), 'latin1')
);

test('income up to 80 000 kr uses the amount in the table', () => {
  assert.equal(findTaxFromTable(rows, 80000, 31), 25985);
});

test('income above 80 000 kr is taxed by percentage', () => {
  assert.equal(findTaxFromTable(rows, 80200, 31), Math.floor(80200 * 0.33));
});

test('tax does not fall when income passes 80 000 kr', () => {
  const below = findTaxFromTable(rows, 80000, 31);
  const above = findTaxFromTable(rows, 80001, 31);

  assert.ok(above >= below);
});
