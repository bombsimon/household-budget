import type {
  User,
  UserBudgetBreakdown,
  ExpenseCategory,
  Asset,
  Loan,
  PersonalExpenseCategory,
} from '../types';
import { PieChart, ArrowUp, ArrowDown } from 'lucide-react';
import { useState } from 'react';
import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import {
  getMonthlyAmount,
  formatMoney,
  getFrequencyText,
} from '../utils/expenseCalculations';
import { BudgetBreakdownSummary } from './BudgetBreakdownSummary';

interface IndividualBudgetProps {
  users: User[];
  breakdowns: UserBudgetBreakdown[];
  categories: ExpenseCategory[];
  personalCategories: PersonalExpenseCategory[];
  assets: Asset[];
  loans: Loan[];
}

export function IndividualBudget({
  users,
  breakdowns,
  categories,
  // personalCategories,
  assets,
  loans,
}: IndividualBudgetProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-6">
        Individual Budget Breakdown
      </h2>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {users.map((user) => {
          const breakdown = breakdowns.find((b) => b.userId === user.id);
          if (!breakdown) return null;

          const personalExpenses = categories
            .flatMap((cat) => cat.expenses)
            .filter((exp) => exp.userId === user.id && !exp.isShared);

          // Calculate shared expenses from categories
          const categorySharedExpenses = categories.reduce(
            (total, category) => {
              return (
                total +
                category.expenses
                  .filter((exp) => exp.isShared)
                  .reduce((expTotal, exp) => {
                    if (exp.splitType === 'equal') {
                      return expTotal + getMonthlyAmount(exp) / users.length;
                    } else if (
                      exp.splitType === 'percentage' &&
                      exp.splitData?.[user.id]
                    ) {
                      return (
                        expTotal +
                        getMonthlyAmount(exp) * exp.splitData[user.id]
                      );
                    }
                    return expTotal;
                  }, 0)
              );
            },
            0
          );

          // Calculate individual asset allocations
          const assetAllocations = assets
            .map((asset) => {
              const allocation = asset.fixedCosts
                .filter((exp) => exp.isShared)
                .reduce((total, exp) => {
                  if (exp.splitType === 'equal') {
                    return total + getMonthlyAmount(exp) / users.length;
                  } else if (
                    exp.splitType === 'percentage' &&
                    exp.splitData?.[user.id]
                  ) {
                    return (
                      total + getMonthlyAmount(exp) * exp.splitData[user.id]
                    );
                  }
                  return total;
                }, 0);

              return { name: asset.name, amount: allocation };
            })
            .filter((asset) => asset.amount > 0);

          // Calculate individual loan allocations
          const totalInterestAllocation = loans.reduce((total, loan) => {
            if (!loan.isInterestShared) return total;

            const interestAmount =
              (loan.currentAmount * loan.interestRate) / 100 / 12;

            if (loan.interestSplitType === 'equal') {
              return total + interestAmount / users.length;
            } else if (
              loan.interestSplitType === 'percentage' &&
              loan.interestSplitData?.[user.id]
            ) {
              return total + interestAmount * loan.interestSplitData[user.id];
            }
            return total;
          }, 0);

          const totalMortgageAllocation = loans.reduce((total, loan) => {
            if (!loan.isMortgageShared) return total;

            const mortgageAmount =
              loan.monthlyPayment -
              (loan.currentAmount * loan.interestRate) / 100 / 12;

            if (loan.mortgageSplitType === 'equal') {
              return total + mortgageAmount / users.length;
            } else if (
              loan.mortgageSplitType === 'percentage' &&
              loan.mortgageSplitData?.[user.id]
            ) {
              return total + mortgageAmount * loan.mortgageSplitData[user.id];
            }
            return total;
          }, 0);

          const loanAllocations = [
            { name: 'Loan interests', amount: totalInterestAllocation },
            { name: 'Loan principal', amount: totalMortgageAllocation },
          ];

          return (
            <UserBudgetCard
              key={user.id}
              user={user}
              breakdown={breakdown}
              personalExpenses={personalExpenses}
              categorySharedExpenses={categorySharedExpenses}
              assetAllocations={assetAllocations}
              loanAllocations={loanAllocations}
              categories={categories}
              assets={assets}
              loans={loans}
              users={users}
            />
          );
        })}
      </div>
    </div>
  );
}

interface UserBudgetCardProps {
  user: User;
  breakdown: UserBudgetBreakdown;
  personalExpenses: any[];
  categorySharedExpenses: number;
  assetAllocations: { name: string; amount: number }[];
  loanAllocations: { name: string; amount: number }[];
  categories: ExpenseCategory[];
  assets: Asset[];
  loans: Loan[];
  users: User[];
}

function UserBudgetCard({
  user,
  breakdown,
  personalExpenses,
  categorySharedExpenses,
  assetAllocations,
  loanAllocations,
  categories,
  assets,
  loans,
  users,
}: UserBudgetCardProps) {
  const [sortBy, setSortBy] = useState<'name' | 'amount'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const sortExpenses = (expenses: any[]) => {
    return expenses.sort((a, b) => {
      let aValue, bValue;

      if (sortBy === 'name') {
        aValue = a.name.toLowerCase();
        bValue = b.name.toLowerCase();
        return sortOrder === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      } else {
        aValue = getMonthlyAmount(a);
        bValue = getMonthlyAmount(b);
        return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
      }
    });
  };

  const toggleSort = (newSortBy: 'name' | 'amount') => {
    if (sortBy === newSortBy) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(newSortBy);
      setSortOrder('asc');
    }
  };

  // Filter out uncategorized from breakdown since we'll handle it separately
  const sortedCategories = [...breakdown.personalExpenseBreakdown]
    .filter((cat) => cat.categoryId !== 'uncategorized')
    .sort((a, b) => a.categoryName.localeCompare(b.categoryName));

  // Add Uncategorized category if there are uncategorized expenses
  const uncategorizedExpenses = personalExpenses.filter(
    (exp) => !exp.personalCategoryId
  );
  const categoriesWithUncategorized =
    uncategorizedExpenses.length > 0
      ? [
          {
            categoryId: 'uncategorized',
            categoryName: 'Uncategorized',
            amount: uncategorizedExpenses.reduce(
              (sum, exp) => sum + getMonthlyAmount(exp),
              0
            ),
            percentage: 0,
          },
          ...sortedCategories,
        ]
      : sortedCategories;

  // Separate small categories for grouping
  const smallCategories = breakdown.personalExpenseBreakdown.filter(
    (category) => category.percentage <= 1 && category.amount <= 500
  );

  const otherPersonalAmount = smallCategories.reduce(
    (total, category) => total + category.amount,
    0
  );

  // Create pie chart data for expense breakdown - split shared expenses into components
  const chartData = [
    // Split shared expenses into subcategories
    ...(categorySharedExpenses > 0
      ? [
          {
            name: 'Household Expenses',
            value: (categorySharedExpenses / breakdown.income) * 100,
            amount: categorySharedExpenses,
            color: '#3B82F6',
          },
        ]
      : []),
    // Individual assets
    ...assetAllocations
      .filter((asset) => asset.amount > 0)
      .map((asset, index) => ({
        name: asset.name,
        value: (asset.amount / breakdown.income) * 100,
        amount: asset.amount,
        color: `hsl(${(index * 45 + 120) % 360}, 70%, 50%)`,
      })),
    // Individual loans - separate interest and principal
    ...loanAllocations
      .filter((loan) => loan.amount > 0)
      .map((loan) => ({
        name: loan.name,
        value: (loan.amount / breakdown.income) * 100,
        amount: loan.amount,
        color: loan.name === 'Loan interests' ? '#F59E0B' : '#8B5CF6',
      })),
    // Personal expenses - only show categories with significant amounts (>1% or >500 kr)
    ...breakdown.personalExpenseBreakdown
      .filter((category) => category.percentage > 1 || category.amount > 500)
      .map((category, index) => ({
        name: category.categoryName,
        value: category.percentage,
        amount: category.amount,
        color: `hsl(${(index * 30 + 200) % 360}, 65%, 55%)`,
      })),
    // Group small personal expenses into "Other Personal"
    ...(otherPersonalAmount > 0
      ? [
          {
            name: 'Other Personal',
            value: (otherPersonalAmount / breakdown.income) * 100,
            amount: otherPersonalAmount,
            color: '#9CA3AF',
            includedCategories: smallCategories, // Track what's included
          },
        ]
      : []),
  ].filter((item) => item.value > 0);

  return (
    <div className="border border-gray-200 rounded-lg p-6 space-y-6">
      <div className="flex items-center gap-3 mb-4">
        <div
          className="w-4 h-4 rounded-full"
          style={{ backgroundColor: user.color }}
        />
        <h3 className="text-lg font-semibold text-gray-900">{user.name}</h3>
      </div>

      <BudgetBreakdownSummary
        user={user}
        breakdown={breakdown}
        categories={categories}
        assets={assets}
        loans={loans}
        users={users}
      />

      {/* Expense Breakdown Visualization */}
      {chartData.length > 1 && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
            <PieChart className="w-4 h-4" />
            Expense Breakdown by Category
          </h4>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Chart */}
            <div className="lg:col-span-2">
              <div className="h-64 sm:h-72 lg:h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={chartData.length > 6 ? 70 : 80}
                      dataKey="value"
                      labelLine={false}
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value, name) => {
                        const item = chartData.find((d) => d.name === name);
                        return [
                          `${formatMoney(item?.amount || 0)} kr (${typeof value === 'number' ? value.toFixed(1) : value}%)`,
                          name,
                        ];
                      }}
                    />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Custom Legend */}
            <div className="space-y-2">
              <h5 className="text-sm font-medium text-gray-700 mb-3">
                Categories
              </h5>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {chartData.map((item, index) => (
                  <div key={index}>
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <div
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="text-gray-700 truncate font-medium">
                          {item.name}
                        </span>
                      </div>
                      <div className="text-right flex-shrink-0 ml-2">
                        <div className="text-gray-900 font-medium whitespace-nowrap">
                          {formatMoney(item.amount)}&nbsp;kr
                        </div>
                        <div className="text-gray-500 text-xs">
                          {item.value.toFixed(1)}%
                        </div>
                      </div>
                    </div>
                    {/* Show included categories for "Other Personal" */}
                    {item.name === 'Other Personal' &&
                      'includedCategories' in item &&
                      item.includedCategories &&
                      item.includedCategories.length > 0 && (
                        <div className="ml-5 mt-1 text-xs text-gray-500">
                          <div className="italic">This includes:</div>
                          <div className="ml-2">
                            {item.includedCategories.map(
                              (cat: any, catIndex: number) => (
                                <div key={catIndex}>• {cat.categoryName}</div>
                              )
                            )}
                          </div>
                        </div>
                      )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Personal Expense Categories Detail */}
      {categoriesWithUncategorized.length > 0 && (
        <div>
          <div className="flex justify-between items-center mb-3">
            <h4 className="text-sm font-medium text-gray-700">
              Personal Expense Details
            </h4>
            <div className="flex gap-2">
              <button
                onClick={() => toggleSort('name')}
                className={`flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors ${
                  sortBy === 'name'
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Name
                {sortBy === 'name' &&
                  (sortOrder === 'asc' ? (
                    <ArrowUp className="w-3 h-3" />
                  ) : (
                    <ArrowDown className="w-3 h-3" />
                  ))}
              </button>
              <button
                onClick={() => toggleSort('amount')}
                className={`flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors ${
                  sortBy === 'amount'
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Amount
                {sortBy === 'amount' &&
                  (sortOrder === 'asc' ? (
                    <ArrowUp className="w-3 h-3" />
                  ) : (
                    <ArrowDown className="w-3 h-3" />
                  ))}
              </button>
            </div>
          </div>
          <div className="space-y-3">
            {categoriesWithUncategorized.map((category) => {
              const categoryExpenses =
                category.categoryId === 'uncategorized'
                  ? uncategorizedExpenses
                  : personalExpenses.filter(
                      (exp) => exp.personalCategoryId === category.categoryId
                    );

              return (
                <div
                  key={category.categoryId}
                  className="border border-gray-200 rounded-lg p-3"
                >
                  <div className="flex justify-between items-center mb-2">
                    <h5 className="font-medium text-gray-800">
                      {category.categoryName}
                    </h5>
                    <div className="text-right">
                      <span className="text-lg font-semibold text-gray-900 whitespace-nowrap">
                        {formatMoney(category.amount)}&nbsp;kr
                      </span>
                      <div className="text-sm text-gray-500">
                        {category.percentage > 0
                          ? `${category.percentage.toFixed(1)}% of income`
                          : ''}
                      </div>
                    </div>
                  </div>

                  {/* Expenses list */}
                  {categoryExpenses.length > 0 && (
                    <div className="space-y-1 border-t border-gray-100 pt-2">
                      {sortExpenses([...categoryExpenses]).map((expense) => (
                        <div key={expense.id} className="text-sm">
                          <div className="flex justify-between items-start sm:items-center py-1 px-2">
                            <span className="font-medium text-gray-700 text-left flex-1">
                              {expense.name}
                            </span>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {expense.isYearly && (
                                <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded-full whitespace-nowrap">
                                  {getFrequencyText(expense)}
                                </span>
                              )}
                              <span className="text-gray-500 whitespace-nowrap">
                                {formatMoney(getMonthlyAmount(expense))}&nbsp;kr
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {categoryExpenses.length === 0 && (
                    <div className="text-sm text-gray-400 italic border-t border-gray-100 pt-2">
                      No expenses in this category.
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
