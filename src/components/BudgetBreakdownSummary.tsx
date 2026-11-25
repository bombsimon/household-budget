import { formatMoney, getMonthlyAmount } from '../utils/expenseCalculations';

import {
  getAssetExpenses,
  getExpenseCostForUser,
} from '../utils/costAllocation';
import type {
  User,
  UserBudgetBreakdown,
  ExpenseCategory,
  Asset,
  Expense,
} from '../types';

interface BudgetBreakdownSummaryProps {
  user: User;
  breakdown: UserBudgetBreakdown;
  categories: ExpenseCategory[];
  assets: Asset[];
  users: User[];
  blurSensitive?: boolean;
}

export function BudgetBreakdownSummary({
  user,
  breakdown,
  categories,
  assets,
  users,
  blurSensitive = false,
}: BudgetBreakdownSummaryProps) {
  const categorySharedExpenses = breakdown.householdExpenses;
  const assetAllocations = breakdown.assetCosts;
  const loanAllocations = [
    { name: 'Loan interest', amount: breakdown.loanInterest },
    { name: 'Loan repayment', amount: breakdown.loanRepayment },
  ];

  const percentageLeft =
    breakdown.income > 0
      ? (breakdown.remainingAfterExpenses / breakdown.income) * 100
      : 0;
  const isPositive = breakdown.remainingAfterExpenses > 0;

  // Calculate household income percentage
  const totalHouseholdIncome = users.reduce(
    (sum, u) => sum + u.monthlyIncome,
    0
  );
  const householdIncomePercentage =
    totalHouseholdIncome > 0
      ? ((user.monthlyIncome / totalHouseholdIncome) * 100).toFixed(1)
      : '0';

  const sumBudgetedForUser = (expenses: Expense[]): number =>
    expenses
      .filter((expense) => expense.isBudgeted)
      .reduce(
        (sum, expense) => sum + getExpenseCostForUser(expense, users, user.id),
        0
      );
  const categoryBudgetedExpenses = sumBudgetedForUser(
    categories
      .flatMap((category) => category.expenses)
      .filter((expense) => expense.isShared)
  );
  const assetBudgetedAllocations = assets.map((asset) => ({
    name: asset.name,
    amount: sumBudgetedForUser(getAssetExpenses(asset)),
  }));

  // Calculate budgeted personal expenses
  const budgetedPersonalExpenses = categories
    .flatMap((cat) => cat.expenses)
    .filter((exp) => !exp.isShared && exp.userId === user.id && exp.isBudgeted)
    .reduce((sum, exp) => sum + getMonthlyAmount(exp), 0);

  const totalBudgetedExpenses =
    categoryBudgetedExpenses +
    assetBudgetedAllocations.reduce((sum, asset) => sum + asset.amount, 0) +
    budgetedPersonalExpenses;

  const remainingAfterBudgeted =
    breakdown.remainingAfterExpenses - totalBudgetedExpenses;
  const budgetedPercentage =
    breakdown.income > 0 ? (totalBudgetedExpenses / breakdown.income) * 100 : 0;

  // Full breakdown (same as IndividualBudget component)
  return (
    <div className="space-y-4">
      <BudgetLine
        label={`Income before tax (${householdIncomePercentage}% of household)`}
        amount={user.monthlyIncome}
        isSubtotal={false}
        blurSensitive={blurSensitive}
      />

      <BudgetLine
        label="Income after tax"
        amount={breakdown.income}
        isSubtotal={true}
        blurSensitive={blurSensitive}
      />

      <div className="space-y-2">
        <BudgetLine
          label="Household expenses"
          amount={-categorySharedExpenses}
          isSubtotal={false}
        />

        {/* Individual Asset Lines */}
        {assetAllocations
          .filter((asset) => asset.amount > 0)
          .map((asset) => (
            <BudgetLine
              key={`asset-${asset.name}`}
              label={`${asset.name} (asset)`}
              amount={-asset.amount}
              isSubtotal={false}
            />
          ))}

        {/* Individual Loan Lines */}
        {loanAllocations
          .filter((loan) => loan.amount > 0)
          .map((loan) => (
            <BudgetLine
              key={`loan-${loan.name}`}
              label={loan.name}
              amount={-loan.amount}
              isSubtotal={false}
            />
          ))}

        <BudgetLine
          label="Personal expenses"
          amount={-breakdown.personalExpenses}
          isSubtotal={false}
        />
      </div>

      <div className="pt-2 border-t border-line">
        <BudgetLine
          label="Total costs"
          amount={-(breakdown.sharedExpensesOwed + breakdown.personalExpenses)}
          isSubtotal={true}
        />
      </div>

      <div className="pt-2 border-t border-line-strong">
        <BudgetLine
          label="Left"
          isFinal
          amount={breakdown.remainingAfterExpenses}
          isSubtotal={true}
          color={isPositive ? 'text-accent-ink' : 'text-danger-ink'}
          blurSensitive={blurSensitive}
        />

        <div
          className={`text-sm text-muted mt-1 ${blurSensitive ? 'blur-md select-none' : ''}`}
        >
          {percentageLeft.toFixed(1)}% of after-tax income
        </div>
      </div>

      {/* Budgeted Expenses Section */}
      {totalBudgetedExpenses > 0 && (
        <>
          <div className="pt-2 border-t border-line-strong">
            <div className="text-sm font-medium text-ink-strong mb-2">
              Budgeted
            </div>

            <div className="space-y-2">
              {/* Household Categories */}
              {categoryBudgetedExpenses > 0 && (
                <BudgetLine
                  label="Household"
                  amount={-categoryBudgetedExpenses}
                  isSubtotal={false}
                />
              )}

              {/* Individual Assets */}
              {assetBudgetedAllocations
                .filter((asset) => asset.amount > 0)
                .map((asset) => (
                  <BudgetLine
                    key={`budgeted-asset-${asset.name}`}
                    label={`${asset.name} (asset)`}
                    amount={-asset.amount}
                    isSubtotal={false}
                  />
                ))}

              {/* Personal Expenses (grouped) */}
              {budgetedPersonalExpenses > 0 && (
                <BudgetLine
                  label="Personal expenses"
                  amount={-budgetedPersonalExpenses}
                  isSubtotal={false}
                />
              )}
            </div>
          </div>

          <div className="pt-2 border-t border-line">
            <BudgetLine
              label="Total budgeted"
              amount={-totalBudgetedExpenses}
              isSubtotal={true}
            />

            <div
              className={`text-sm text-muted mt-1 ${blurSensitive ? 'blur-md select-none' : ''}`}
            >
              {budgetedPercentage.toFixed(1)}% of after-tax income
            </div>
          </div>

          <div className="pt-2 border-t border-line-strong">
            <BudgetLine
              label="Left after budgeted"
              isFinal
              amount={remainingAfterBudgeted}
              isSubtotal={true}
              color={
                remainingAfterBudgeted > 0
                  ? 'text-accent-ink'
                  : 'text-danger-ink'
              }
              blurSensitive={blurSensitive}
            />

            <div
              className={`text-sm text-muted mt-1 ${blurSensitive ? 'blur-md select-none' : ''}`}
            >
              {breakdown.income > 0
                ? ((remainingAfterBudgeted / breakdown.income) * 100).toFixed(1)
                : '0'}
              % of after-tax income
            </div>
          </div>
        </>
      )}
    </div>
  );
}

interface BudgetLineProps {
  label: string;
  amount: number;
  isSubtotal: boolean;
  isFinal?: boolean;
  color?: string;
  blurSensitive?: boolean;
}

function BudgetLine({
  label,
  amount,
  isSubtotal,
  isFinal = false,
  color = 'text-ink',
  blurSensitive = false,
}: BudgetLineProps) {
  return (
    <div
      className={`flex justify-between items-center ${isSubtotal ? 'font-semibold' : ''}`}
    >
      <span
        className={`${color} ${isSubtotal ? 'text-base' : 'text-sm'} min-w-0`}
      >
        {label}
      </span>
      <div className="flex items-center gap-2 flex-shrink-0">
        <span
          className={`${color} ${isSubtotal ? 'text-base' : 'text-sm'} money ${isFinal ? 'ledger-total text-xl' : ''} ${blurSensitive ? 'blur-md select-none' : ''}`}
        >
          {formatMoney(isFinal ? amount : Math.abs(amount))}&nbsp;kr
        </span>
      </div>
    </div>
  );
}
