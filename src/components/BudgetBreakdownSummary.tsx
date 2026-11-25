import { formatMoney, getMonthlyAmount } from '../utils/expenseCalculations';

// Helper function to migrate legacy asset data structure
const migrateAssetData = (asset: Asset): Asset => {
  if (
    !asset.expenses &&
    ((asset as any).fixedCosts || (asset as any).variableCosts)
  ) {
    return {
      ...asset,
      expenses: [
        ...((asset as any).fixedCosts || []).map((exp: any) => ({
          ...exp,
          isBudgeted: false,
        })),
        ...((asset as any).variableCosts || []).map((exp: any) => ({
          ...exp,
          isBudgeted: true,
        })),
      ],
    };
  }
  return {
    ...asset,
    expenses: asset.expenses || [],
  };
};
import type {
  User,
  UserBudgetBreakdown,
  ExpenseCategory,
  Asset,
  Loan,
} from '../types';

interface BudgetBreakdownSummaryProps {
  user: User;
  breakdown: UserBudgetBreakdown;
  categories: ExpenseCategory[];
  assets: Asset[];
  loans: Loan[];
  users: User[];
  blurSensitive?: boolean;
}

export function BudgetBreakdownSummary({
  user,
  breakdown,
  categories,
  assets,
  loans,
  users,
  blurSensitive = false,
}: BudgetBreakdownSummaryProps) {
  // Calculate shared expenses from the single shared category
  const sharedCategory = categories.find((cat) => cat.id === 'shared');
  const categorySharedExpenses = sharedCategory
    ? sharedCategory.expenses
        .filter((exp) => exp.isShared && !exp.isBudgeted)
        .reduce((total, exp) => {
          if (exp.splitType === 'equal') {
            return total + getMonthlyAmount(exp) / users.length;
          } else if (
            exp.splitType === 'percentage' &&
            exp.splitData?.[user.id]
          ) {
            return total + getMonthlyAmount(exp) * exp.splitData[user.id];
          }
          return total;
        }, 0)
    : 0;

  // Calculate individual asset allocations
  const assetAllocations = assets.map((asset) => {
    const migratedAsset = migrateAssetData(asset);
    const allocation = migratedAsset.expenses
      .filter((exp: any) => !exp.isBudgeted && exp.isShared)
      .reduce((total, exp) => {
        if (exp.splitType === 'equal') {
          return total + getMonthlyAmount(exp) / users.length;
        } else if (exp.splitType === 'percentage' && exp.splitData?.[user.id]) {
          return total + getMonthlyAmount(exp) * exp.splitData[user.id];
        }
        return total;
      }, 0);
    return { name: asset.name, amount: allocation };
  });

  // Calculate loan allocations - separate interest and repayment
  let totalInterestAllocation = 0;
  let totalRepaymentAllocation = 0;

  loans.forEach((loan) => {
    const monthlyInterest = (loan.currentAmount * loan.interestRate) / 12;
    const monthlyRepayment = loan.monthlyPayment;

    // Fallback for old loan structure - if new properties don't exist, use old properties
    const isInterestShared =
      loan.isInterestShared !== undefined
        ? loan.isInterestShared
        : (loan as any).isShared;
    const interestSplitType =
      loan.interestSplitType || (loan as any).splitType || 'percentage';
    const interestSplitData = loan.interestSplitData || (loan as any).splitData;

    const isRepaymentShared = loan.isRepaymentShared;
    const repaymentSplitType = loan.repaymentSplitType || 'equal';
    const repaymentSplitData = loan.repaymentSplitData;

    // Interest allocation
    if (isInterestShared) {
      if (interestSplitType === 'equal') {
        totalInterestAllocation += monthlyInterest / users.length;
      } else if (
        interestSplitType === 'percentage' &&
        interestSplitData?.[user.id]
      ) {
        totalInterestAllocation += monthlyInterest * interestSplitData[user.id];
      }
    }

    // Repayment allocation
    if (isRepaymentShared) {
      if (repaymentSplitType === 'equal') {
        totalRepaymentAllocation += monthlyRepayment / users.length;
      } else if (
        repaymentSplitType === 'percentage' &&
        repaymentSplitData?.[user.id]
      ) {
        totalRepaymentAllocation +=
          monthlyRepayment * repaymentSplitData[user.id];
      }
    }
  });

  const loanAllocations = [
    { name: 'Loan interest', amount: totalInterestAllocation },
    { name: 'Loan repayment', amount: totalRepaymentAllocation },
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

  // Calculate budgeted expenses
  const categoryBudgetedExpenses = sharedCategory
    ? sharedCategory.expenses
        .filter((exp) => exp.isShared && exp.isBudgeted)
        .reduce((total, exp) => {
          if (exp.splitType === 'equal') {
            return total + getMonthlyAmount(exp) / users.length;
          } else if (
            exp.splitType === 'percentage' &&
            exp.splitData?.[user.id]
          ) {
            return total + getMonthlyAmount(exp) * exp.splitData[user.id];
          }
          return total;
        }, 0)
    : 0;

  // Calculate budgeted asset allocations
  const assetBudgetedAllocations = assets.map((asset) => {
    const migratedAsset = migrateAssetData(asset);
    const allocation = migratedAsset.expenses
      .filter((exp: any) => exp.isBudgeted && exp.isShared)
      .reduce((total, exp) => {
        if (exp.splitType === 'equal') {
          return total + getMonthlyAmount(exp) / users.length;
        } else if (exp.splitType === 'percentage' && exp.splitData?.[user.id]) {
          return total + getMonthlyAmount(exp) * exp.splitData[user.id];
        }
        return total;
      }, 0);
    return { name: asset.name, amount: allocation };
  });

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

      <div className="pt-2 border-t border-slate-200">
        <BudgetLine
          label="Total costs"
          amount={-(breakdown.sharedExpensesOwed + breakdown.personalExpenses)}
          isSubtotal={true}
        />
      </div>

      <div className="pt-2 border-t border-slate-300">
        <BudgetLine
          label="Left"
          isFinal
          amount={breakdown.remainingAfterExpenses}
          isSubtotal={true}
          color={isPositive ? 'text-blue-800' : 'text-red-700'}
          blurSensitive={blurSensitive}
        />

        <div
          className={`text-sm text-slate-600 mt-1 ${blurSensitive ? 'blur-md select-none' : ''}`}
        >
          {percentageLeft.toFixed(1)}% of after-tax income
        </div>
      </div>

      {/* Budgeted Expenses Section */}
      {totalBudgetedExpenses > 0 && (
        <>
          <div className="pt-2 border-t border-slate-300">
            <div className="text-sm font-medium text-slate-800 mb-2">
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

          <div className="pt-2 border-t border-slate-200">
            <BudgetLine
              label="Total budgeted"
              amount={-totalBudgetedExpenses}
              isSubtotal={true}
            />

            <div
              className={`text-sm text-slate-600 mt-1 ${blurSensitive ? 'blur-md select-none' : ''}`}
            >
              {budgetedPercentage.toFixed(1)}% of after-tax income
            </div>
          </div>

          <div className="pt-2 border-t border-slate-300">
            <BudgetLine
              label="Left after budgeted"
              isFinal
              amount={remainingAfterBudgeted}
              isSubtotal={true}
              color={
                remainingAfterBudgeted > 0 ? 'text-blue-800' : 'text-red-700'
              }
              blurSensitive={blurSensitive}
            />

            <div
              className={`text-sm text-slate-600 mt-1 ${blurSensitive ? 'blur-md select-none' : ''}`}
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
  color = 'text-slate-900',
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
