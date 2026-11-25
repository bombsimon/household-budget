import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getAssetExpenses,
  getSettlements,
  getUserBalances,
  getUserCosts,
  type UserBalance,
} from '../src/utils/costAllocation.ts';
import type { Asset, Expense, Loan, User } from '../src/types/index.ts';

const user = (id: string, monthlyIncome: number): User => ({
  id,
  name: id,
  monthlyIncome,
  color: '#000',
  municipalityCode: '180',
  municipalityName: 'Stockholm',
});

const expense = (values: Partial<Expense>): Expense => ({
  id: 'expense',
  name: 'Rent',
  amount: 1000,
  isShared: true,
  splitType: 'equal',
  paidBy: 'anna',
  ...values,
});

const loan = (values: Partial<Loan>): Loan => ({
  id: 'loan',
  name: 'Home',
  originalAmount: 100000,
  currentAmount: 60000,
  interestRate: 0.02,
  monthlyPayment: 1000,
  paidBy: 'anna',
  isInterestShared: true,
  interestSplitType: 'percentage',
  interestSplitData: { anna: 0.6, johan: 0.4 },
  isRepaymentShared: true,
  repaymentSplitType: 'percentage',
  repaymentSplitData: { anna: 0.6, johan: 0.4 },
  ...values,
});

const users = [user('anna', 600), user('johan', 400)];
const household = { users, categories: [], assets: [], loans: [] };
const balance = (total: number): UserBalance => ({
  total,
  sharedExpenses: total,
  personalExpenses: 0,
  assets: {},
  loanInterests: 0,
  loanRepayments: 0,
});

test('shared loans follow their stored split', () => {
  const costs = getUserCosts({ ...household, loans: [loan({})] }, 'anna');

  assert.equal(costs.loanInterest, 60);
  assert.equal(costs.loanRepayment, 600);
});

test('a personal loan costs only its payer and creates no debt', () => {
  const data = {
    ...household,
    loans: [loan({ isInterestShared: false, isRepaymentShared: false })],
  };

  assert.equal(getUserCosts(data, 'anna').loanRepayment, 1000);
  assert.equal(getUserCosts(data, 'johan').loanRepayment, 0);
  assert.equal(getUserBalances(data).anna.total, 0);
  assert.deepEqual(getSettlements(getUserBalances(data)), []);
});

test('repayment never exceeds the remaining balance', () => {
  const data = { ...household, loans: [loan({ currentAmount: 500 })] };

  assert.equal(getUserCosts(data, 'anna').loanRepayment, 300);
});

test('a percentage expense without stored shares splits by income', () => {
  const data = {
    ...household,
    categories: [
      {
        id: 'shared',
        name: 'Shared',
        expenses: [expense({ splitType: 'percentage' })],
      },
    ],
  };

  assert.equal(getUserCosts(data, 'johan').household, 400);
  assert.equal(getUserBalances(data).johan.total, -400);
});

test('every fixed cost is assigned to someone', () => {
  const data = {
    ...household,
    categories: [{ id: 'shared', name: 'Shared', expenses: [expense({})] }],
    assets: [
      {
        id: 'car',
        name: 'Car',
        expenses: [
          expense({ amount: 300 }),
          expense({ amount: 200, isShared: false, userId: 'johan' }),
        ],
      },
    ],
    loans: [loan({})],
  };
  const total = users
    .map(({ id }) => getUserCosts(data, id))
    .reduce(
      (sum, costs) =>
        sum +
        costs.household +
        costs.loanInterest +
        costs.loanRepayment +
        costs.assets.reduce((assetSum, asset) => assetSum + asset.amount, 0),
      0
    );

  assert.equal(total, 1000 + 300 + 200 + 100 + 1000);
});

test('balances equal the sum of their rows and net to zero', () => {
  const data = {
    ...household,
    categories: [
      {
        id: 'shared',
        name: 'Shared',
        expenses: [
          expense({}),
          expense({ amount: 50, isShared: false, userId: 'johan' }),
        ],
      },
    ],
    loans: [loan({})],
  };
  const balances = getUserBalances(data);

  Object.values(balances).forEach((entry) => {
    assert.equal(
      entry.total,
      entry.sharedExpenses +
        entry.personalExpenses +
        entry.loanInterests +
        entry.loanRepayments
    );
  });
  assert.equal(balances.anna.total + balances.johan.total, 0);
  assert.equal(balances.johan.personalExpenses, -50);
});

test('several debtors never overpay one creditor', () => {
  const settlements = getSettlements({
    a: balance(100),
    b: balance(100),
    c: balance(-100),
    d: balance(-100),
  });
  const received = (userId: string) =>
    settlements
      .filter((settlement) => settlement.to === userId)
      .reduce((sum, settlement) => sum + settlement.amount, 0);

  assert.equal(received('a'), 100);
  assert.equal(received('b'), 100);
});

test('rounding noise is not a transfer', () => {
  assert.deepEqual(getSettlements({ a: balance(1e-9), b: balance(-1e-9) }), []);
});

test('legacy assets keep their costs', () => {
  const asset = {
    id: 'car',
    name: 'Car',
    fixedCosts: [expense({})],
    variableCosts: [expense({})],
  } as unknown as Asset;

  assert.deepEqual(
    getAssetExpenses(asset).map(({ isBudgeted }) => isBudgeted),
    [false, true]
  );
});
