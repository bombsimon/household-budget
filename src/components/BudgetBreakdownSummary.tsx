import { TrendingUp, TrendingDown } from 'lucide-react';
import { formatMoney, getMonthlyAmount } from '../utils/expenseCalculations';
import {
  formatTaxRate,
  getDefaultMunicipalTaxRate,
} from '../utils/swedishTaxCalculation';
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
  compact?: boolean;
}

export function BudgetBreakdownSummary({
  user,
  breakdown,
  categories,
  assets,
  loans,
  users,
  compact = false,
}: BudgetBreakdownSummaryProps) {
  // Calculate shared expenses from the single shared category
  const sharedCategory = categories.find((cat) => cat.id === 'shared');
  const categorySharedExpenses = sharedCategory
    ? sharedCategory.expenses
        .filter((exp) => exp.isShared)
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
    const allocation = asset.fixedCosts
      .filter((exp) => exp.isShared)
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

  // Calculate loan allocations - separate interest and mortgage
  let totalInterestAllocation = 0;
  let totalMortgageAllocation = 0;

  loans.forEach((loan) => {
    const monthlyInterest = (loan.currentAmount * loan.interestRate) / 12;
    const monthlyPrincipal = loan.monthlyPayment;

    // Fallback for old loan structure - if new properties don't exist, use old properties
    const isInterestShared =
      loan.isInterestShared !== undefined
        ? loan.isInterestShared
        : (loan as any).isShared;
    const interestSplitType =
      loan.interestSplitType || (loan as any).splitType || 'percentage';
    const interestSplitData = loan.interestSplitData || (loan as any).splitData;

    const isMortgageShared =
      loan.isMortgageShared !== undefined
        ? loan.isMortgageShared
        : (loan as any).isShared;
    const mortgageSplitType =
      loan.mortgageSplitType || (loan as any).splitType || 'equal';
    const mortgageSplitData = loan.mortgageSplitData || (loan as any).splitData;

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

    // Mortgage allocation
    if (isMortgageShared) {
      if (mortgageSplitType === 'equal') {
        totalMortgageAllocation += monthlyPrincipal / users.length;
      } else if (
        mortgageSplitType === 'percentage' &&
        mortgageSplitData?.[user.id]
      ) {
        totalMortgageAllocation +=
          monthlyPrincipal * mortgageSplitData[user.id];
      }
    }
  });

  const loanAllocations = [
    { name: 'Loan interests', amount: totalInterestAllocation },
    { name: 'Loan principal', amount: totalMortgageAllocation },
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

  if (compact) {
    return (
      <div className="space-y-2 text-sm">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-xs text-gray-500 mb-1">Income & Expenses</div>
            <div className="space-y-1">
              <div className="flex justify-between">
                <span>After Tax Income:</span>
                <span className="font-medium">
                  {formatMoney(breakdown.income)} kr
                </span>
              </div>
              <div className="flex justify-between">
                <span>Household Expenses:</span>
                <span className="text-red-600">
                  -{formatMoney(breakdown.sharedExpensesOwed)} kr
                </span>
              </div>
              <div className="flex justify-between">
                <span>Personal Expenses:</span>
                <span className="text-orange-600">
                  -{formatMoney(breakdown.personalExpenses)} kr
                </span>
              </div>
              <div className="flex justify-between border-t pt-1">
                <span>Remaining:</span>
                <span
                  className={
                    isPositive
                      ? 'text-green-600 font-medium'
                      : 'text-red-600 font-medium'
                  }
                >
                  {formatMoney(breakdown.remainingAfterExpenses)} kr
                </span>
              </div>
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-500 mb-1">Breakdown</div>
            <div className="space-y-1">
              {categorySharedExpenses > 0 && (
                <div className="flex justify-between text-xs">
                  <span>Household Categories:</span>
                  <span>-{formatMoney(categorySharedExpenses)} kr</span>
                </div>
              )}
              {assetAllocations
                .filter((asset) => asset.amount > 0)
                .map((asset) => (
                  <div
                    key={asset.name}
                    className="flex justify-between text-xs"
                  >
                    <span>{asset.name} (asset):</span>
                    <span>-{formatMoney(asset.amount)} kr</span>
                  </div>
                ))}
              {loanAllocations
                .filter((loan) => loan.amount > 0)
                .map((loan) => (
                  <div key={loan.name} className="flex justify-between text-xs">
                    <span>{loan.name}:</span>
                    <span>-{formatMoney(loan.amount)} kr</span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Full breakdown (same as IndividualBudget component)
  return (
    <div className="space-y-4">
      <BudgetLine
        label={`Gross Income (${householdIncomePercentage}% of household)`}
        amount={user.monthlyIncome}
        isSubtotal={false}
      />

      <BudgetLine
        label={`After Tax (${formatTaxRate(user.municipalTaxRate || getDefaultMunicipalTaxRate())} municipal)`}
        amount={breakdown.income}
        isSubtotal={true}
        color="text-blue-600"
      />

      <div className="pl-4 border-l-2 border-gray-200 space-y-2">
        <BudgetLine
          label="Household Expenses"
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
          label="Personal Expenses"
          amount={-breakdown.personalExpenses}
          isSubtotal={false}
        />
      </div>

      <div className="pt-2 border-t border-gray-200">
        <BudgetLine
          label="Total Expenses"
          amount={-(breakdown.sharedExpensesOwed + breakdown.personalExpenses)}
          isSubtotal={true}
        />
      </div>

      <div className="pt-2 border-t border-gray-300">
        <BudgetLine
          label="Remaining"
          amount={breakdown.remainingAfterExpenses}
          isSubtotal={true}
          color={isPositive ? 'text-green-600' : 'text-red-600'}
          showTrend={true}
          trendUp={isPositive}
        />

        <div className="text-sm text-gray-500 mt-1">
          {percentageLeft.toFixed(1)}% of after-tax income
        </div>
      </div>
    </div>
  );
}

interface BudgetLineProps {
  label: string;
  amount: number;
  isSubtotal: boolean;
  color?: string;
  showTrend?: boolean;
  trendUp?: boolean;
}

function BudgetLine({
  label,
  amount,
  isSubtotal,
  color = 'text-gray-900',
  showTrend = false,
  trendUp = true,
}: BudgetLineProps) {
  return (
    <div
      className={`flex justify-between items-center ${isSubtotal ? 'font-semibold' : ''}`}
    >
      <span className={`${color} ${isSubtotal ? 'text-base' : 'text-sm'}`}>
        {label}
      </span>
      <div className="flex items-center gap-2">
        <span className={`${color} ${isSubtotal ? 'text-base' : 'text-sm'}`}>
          {formatMoney(Math.abs(amount))} kr
        </span>
        {showTrend &&
          (trendUp ? (
            <TrendingUp className="w-4 h-4 text-green-500" />
          ) : (
            <TrendingDown className="w-4 h-4 text-red-500" />
          ))}
      </div>
    </div>
  );
}
