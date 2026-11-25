import type {
  Asset,
  Expense,
  ExpenseCategory,
  Loan,
  Settlement,
  User,
} from '../types';
import { getMonthlyAmount } from './expenseCalculations.ts';

interface LegacyAsset {
  fixedCosts?: Expense[];
  variableCosts?: Expense[];
}

interface LegacyLoan {
  isShared?: boolean;
  splitType?: 'percentage' | 'equal';
}

export interface Household {
  users: User[];
  categories: ExpenseCategory[];
  assets: Asset[];
  loans: Loan[];
}

export interface UserCosts {
  household: number;
  assets: { name: string; amount: number }[];
  loanInterest: number;
  loanRepayment: number;
}

export interface UserBalance {
  total: number;
  sharedExpenses: number;
  personalExpenses: number;
  assets: { [assetName: string]: number };
  loanInterests: number;
  loanRepayments: number;
}

// Balances below half an öre are rounding noise, not debts.
const SMALLEST_DEBT = 0.005;

export const getAssetExpenses = (asset: Asset): Expense[] => {
  if (asset.expenses) return asset.expenses;

  const legacy = asset as unknown as LegacyAsset;

  return [
    ...(legacy.fixedCosts ?? []).map((expense) => ({
      ...expense,
      isBudgeted: false,
    })),
    ...(legacy.variableCosts ?? []).map((expense) => ({
      ...expense,
      isBudgeted: true,
    })),
  ];
};

export const getIncomeShare = (users: User[], userId: string): number => {
  const totalIncome = users.reduce((sum, user) => sum + user.monthlyIncome, 0);
  const user = users.find((candidate) => candidate.id === userId);

  if (!user) return 0;

  return totalIncome > 0 ? user.monthlyIncome / totalIncome : 1 / users.length;
};

const getShare = (
  users: User[],
  userId: string,
  splitType: 'percentage' | 'equal'
): number =>
  splitType === 'equal' ? 1 / users.length : getIncomeShare(users, userId);

export const getLoanInterest = (loan: Loan): number =>
  (loan.currentAmount * loan.interestRate) / 12;

export const getLoanRepayment = (loan: Loan): number =>
  Math.min(loan.monthlyPayment, Math.max(0, loan.currentAmount));

const getPayerId = (users: User[], paidBy?: string): string | undefined =>
  paidBy || users[0]?.id;

const getInterestShare = (loan: Loan, users: User[], userId: string) => {
  const legacy = loan as unknown as LegacyLoan;

  if (!(loan.isInterestShared ?? legacy.isShared)) {
    return getPayerId(users, loan.paidBy) === userId ? 1 : 0;
  }

  return getShare(
    users,
    userId,
    loan.interestSplitType || legacy.splitType || 'percentage'
  );
};

const getRepaymentShare = (loan: Loan, users: User[], userId: string) => {
  const legacy = loan as unknown as LegacyLoan;

  if (!(loan.isRepaymentShared ?? legacy.isShared)) {
    return getPayerId(users, loan.paidBy) === userId ? 1 : 0;
  }

  return getShare(
    users,
    userId,
    loan.repaymentSplitType || legacy.splitType || 'equal'
  );
};

export const getExpenseCostForUser = (
  expense: Expense,
  users: User[],
  userId: string
): number => {
  if (!expense.isShared) {
    const ownerId = expense.userId || getPayerId(users, expense.paidBy);

    return ownerId === userId ? getMonthlyAmount(expense) : 0;
  }

  return getMonthlyAmount(expense) * getShare(users, userId, expense.splitType);
};

export const getUserCosts = (
  { users, categories, assets, loans }: Household,
  userId: string
): UserCosts => {
  const sumForUser = (expenses: Expense[]): number =>
    expenses
      .filter((expense) => !expense.isBudgeted)
      .reduce(
        (sum, expense) => sum + getExpenseCostForUser(expense, users, userId),
        0
      );

  return {
    household: sumForUser(
      categories
        .flatMap((category) => category.expenses)
        .filter((expense) => expense.isShared)
    ),
    assets: assets.map((asset) => ({
      name: asset.name,
      amount: sumForUser(getAssetExpenses(asset)),
    })),
    loanInterest: loans.reduce(
      (sum, loan) =>
        sum + getLoanInterest(loan) * getInterestShare(loan, users, userId),
      0
    ),
    loanRepayment: loans.reduce(
      (sum, loan) =>
        sum + getLoanRepayment(loan) * getRepaymentShare(loan, users, userId),
      0
    ),
  };
};

export const getUserBalances = ({
  users,
  categories,
  assets,
  loans,
}: Household): { [userId: string]: UserBalance } => {
  const balances: { [userId: string]: UserBalance } = {};

  users.forEach((user) => {
    balances[user.id] = {
      total: 0,
      sharedExpenses: 0,
      personalExpenses: 0,
      assets: {},
      loanInterests: 0,
      loanRepayments: 0,
    };
  });

  const settle = (
    amount: number,
    payerId: string | undefined,
    getUserShare: (userId: string) => number,
    record: (balance: UserBalance, difference: number) => void
  ) => {
    if (!payerId || !balances[payerId]) return;

    users.forEach((user) => {
      const paid = user.id === payerId ? amount : 0;
      const difference = paid - amount * getUserShare(user.id);

      balances[user.id].total += difference;
      record(balances[user.id], difference);
    });
  };

  categories
    .flatMap((category) => category.expenses)
    .forEach((expense) => {
      if (expense.isShared && !expense.isBudgeted) {
        settle(
          getMonthlyAmount(expense),
          getPayerId(users, expense.paidBy),
          (userId) => getShare(users, userId, expense.splitType),
          (balance, difference) => {
            balance.sharedExpenses += difference;
          }
        );
      } else if (
        !expense.isShared &&
        expense.userId &&
        balances[expense.userId]
      ) {
        settle(
          getMonthlyAmount(expense),
          expense.paidBy || expense.userId,
          (userId) => (userId === expense.userId ? 1 : 0),
          (balance, difference) => {
            balance.personalExpenses += difference;
          }
        );
      }
    });

  assets.forEach((asset) => {
    getAssetExpenses(asset)
      .filter((expense) => expense.isShared && !expense.isBudgeted)
      .forEach((expense) => {
        settle(
          getMonthlyAmount(expense),
          getPayerId(users, expense.paidBy),
          (userId) => getShare(users, userId, expense.splitType),
          (balance, difference) => {
            balance.assets[asset.name] =
              (balance.assets[asset.name] ?? 0) + difference;
          }
        );
      });
  });

  loans.forEach((loan) => {
    const payerId = getPayerId(users, loan.paidBy);

    settle(
      getLoanInterest(loan),
      payerId,
      (userId) => getInterestShare(loan, users, userId),
      (balance, difference) => {
        balance.loanInterests += difference;
      }
    );
    settle(
      getLoanRepayment(loan),
      payerId,
      (userId) => getRepaymentShare(loan, users, userId),
      (balance, difference) => {
        balance.loanRepayments += difference;
      }
    );
  });

  return balances;
};

export const getSettlements = (balances: {
  [userId: string]: UserBalance;
}): Settlement[] => {
  const settlements: Settlement[] = [];
  const creditors = Object.entries(balances)
    .filter(([, balance]) => balance.total > 0)
    .map(([userId, balance]) => ({ userId, remaining: balance.total }));

  Object.entries(balances)
    .filter(([, balance]) => balance.total < 0)
    .forEach(([debtorId, balance]) => {
      let remainingDebt = -balance.total;

      creditors.forEach((creditor) => {
        const amount = Math.min(remainingDebt, creditor.remaining);

        if (amount > SMALLEST_DEBT) {
          settlements.push({ from: debtorId, to: creditor.userId, amount });
          remainingDebt -= amount;
          creditor.remaining -= amount;
        }
      });
    });

  return settlements;
};
