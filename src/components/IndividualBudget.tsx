import type {
  User,
  UserBudgetBreakdown,
  ExpenseCategory,
  Asset,
  Loan,
  PersonalExpenseCategory,
} from '../types';
import { PieChart } from 'lucide-react';
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
import { ExpenseList } from './ExpenseList';

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
  personalCategories,
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

          // Calculate shared expenses from categories - match table calculation exactly
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
                    return (
                      total + getMonthlyAmount(exp) * exp.splitData[user.id]
                    );
                  }
                  return total;
                }, 0)
            : 0;

          // Calculate individual asset allocations (fixed costs)
          const assetAllocations = assets
            .map((asset) => {
              const migratedAsset = migrateAssetData(asset);
              const allocation = migratedAsset.expenses
                .filter((exp: any) => !exp.isBudgeted && exp.isShared)
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

              return { name: asset.name, amount: allocation, type: 'fixed' };
            })
            .filter((asset) => asset.amount > 0);

          // Calculate individual loan allocations
          const totalInterestAllocation = loans.reduce((total, loan) => {
            if (!loan.isInterestShared) return total;

            const interestAmount =
              (loan.currentAmount * loan.interestRate) / 12;

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

          const totalRepaymentAllocation = loans.reduce((total, loan) => {
            if (!loan.isRepaymentShared) return total;

            const monthlyAmortering = loan.monthlyPayment; // Fixed monthly debt repayment (amortering)

            if (loan.repaymentSplitType === 'equal') {
              return total + monthlyAmortering / users.length;
            } else if (
              loan.repaymentSplitType === 'percentage' &&
              loan.repaymentSplitData?.[user.id]
            ) {
              return (
                total + monthlyAmortering * loan.repaymentSplitData[user.id]
              );
            }
            return total;
          }, 0);

          const loanAllocations = [
            { name: 'Loan interests', amount: totalInterestAllocation },
            { name: 'Loan repayment', amount: totalRepaymentAllocation },
          ];

          return (
            <UserBudgetCard
              key={user.id}
              user={user}
              breakdown={breakdown}
              personalExpenses={personalExpenses}
              personalCategories={personalCategories}
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
  personalCategories: PersonalExpenseCategory[];
  categorySharedExpenses: number;
  assetAllocations: { name: string; amount: number; type: string }[];
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
  personalCategories,
  categorySharedExpenses,
  assetAllocations,
  loanAllocations,
  categories,
  assets,
  loans,
  users,
}: UserBudgetCardProps) {
  // Filter out uncategorized from breakdown since we'll handle it separately
  const sortedCategories = [...breakdown.personalExpenseBreakdown]
    .filter((cat) => cat.categoryId !== 'uncategorized')
    .sort((a, b) => a.categoryName.localeCompare(b.categoryName));

  // Add Uncategorized category if there are uncategorized expenses
  const uncategorizedExpenses = personalExpenses.filter(
    (exp) => !exp.personalCategoryId
  );

  // Calculate user's share of household (shared) expenses
  const sharedCategory = categories.find((cat) => cat.id === 'shared');
  const householdExpensesWithShare = sharedCategory
    ? sharedCategory.expenses
        .filter((exp) => exp.isShared)
        .map((exp) => {
          let userShare = 0;
          if (exp.splitType === 'equal') {
            userShare = getMonthlyAmount(exp) / users.length;
          } else if (
            exp.splitType === 'percentage' &&
            exp.splitData?.[user.id]
          ) {
            userShare = getMonthlyAmount(exp) * exp.splitData[user.id];
          }
          return { ...exp, userShareAmount: userShare };
        })
        .filter((exp) => exp.userShareAmount > 0)
    : [];

  // Group household expenses by personalCategoryId
  const householdByCategory = householdExpensesWithShare.reduce(
    (groups, exp) => {
      const catId = exp.personalCategoryId || 'uncategorized';
      if (!groups[catId]) groups[catId] = [];
      groups[catId].push(exp);
      return groups;
    },
    {} as Record<string, typeof householdExpensesWithShare>
  );

  // Collect all category IDs from both personal and household expenses
  const allCategoryIds = new Set<string>();
  personalExpenses.forEach((exp) => {
    allCategoryIds.add(exp.personalCategoryId || 'uncategorized');
  });
  householdExpensesWithShare.forEach((exp) => {
    allCategoryIds.add(exp.personalCategoryId || 'uncategorized');
  });

  // Build merged category list
  const personalCategoryList = categories
    .flatMap((cat) => cat.expenses)
    .filter((exp) => exp.userId === user.id && !exp.isShared);

  const categoriesWithUncategorized = Array.from(allCategoryIds)
    .map((catId) => {
      const existing = breakdown.personalExpenseBreakdown.find(
        (c) => c.categoryId === catId
      );
      const catPersonalExpenses =
        catId === 'uncategorized'
          ? personalCategoryList.filter((exp) => !exp.personalCategoryId)
          : personalCategoryList.filter(
              (exp) => exp.personalCategoryId === catId
            );
      const personalAmount = catPersonalExpenses.reduce(
        (sum, exp) => sum + getMonthlyAmount(exp),
        0
      );
      const householdAmount = (householdByCategory[catId] || []).reduce(
        (sum, exp) => sum + exp.userShareAmount,
        0
      );
      const totalAmount = personalAmount + householdAmount;

      // Find category name from personalCategories or breakdown
      const personalCat = sortedCategories.find(
        (c) => c.categoryId === catId
      );
      let categoryName =
        existing?.categoryName ||
        personalCat?.categoryName ||
        (catId === 'uncategorized' ? 'Uncategorized' : catId);

      // Try to find name from the personal categories passed to the component
      if (
        categoryName === catId &&
        catId !== 'uncategorized'
      ) {
        const found = personalCategories.find((pc) => pc.id === catId);
        if (found) categoryName = found.name;
      }

      return {
        categoryId: catId,
        categoryName,
        amount: totalAmount,
        percentage:
          breakdown.income > 0 ? (totalAmount / breakdown.income) * 100 : 0,
      };
    })
    .sort((a, b) => {
      if (
        a.categoryId === 'uncategorized' &&
        b.categoryId !== 'uncategorized'
      )
        return 1;
      if (
        b.categoryId === 'uncategorized' &&
        a.categoryId !== 'uncategorized'
      )
        return -1;
      return a.categoryName.localeCompare(b.categoryName);
    });

  // Separate small categories for grouping
  const smallCategories = breakdown.personalExpenseBreakdown.filter(
    (category) => category.percentage <= 1 && category.amount <= 500
  );

  const otherPersonalAmount = smallCategories.reduce(
    (total, category) => total + category.amount,
    0
  );

  // Create pie chart data for expense breakdown - match table structure exactly
  const chartData = [
    // Household Expenses (only shared category expenses, matching table)
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
    // Individual assets - show each asset separately (matching table structure)
    ...assetAllocations
      .filter((asset) => asset.amount > 0)
      .map((asset, index) => ({
        name: `${asset.name} (asset)`,
        value: (asset.amount / breakdown.income) * 100,
        amount: asset.amount,
        color: `hsl(${(index * 45 + 120) % 360}, 70%, 50%)`,
        type: 'asset',
      })),
    // Individual loans - separate interest and repayment (matching table)
    ...loanAllocations
      .filter((loan) => Math.abs(loan.amount) > 0) // Show both positive and negative amounts
      .map((loan) => ({
        name: loan.name,
        value: (Math.abs(loan.amount) / breakdown.income) * 100, // Use absolute value for percentage
        amount: Math.abs(loan.amount), // Display absolute value in chart
        color: loan.name === 'Loan interests' ? '#F59E0B' : '#8B5CF6',
        type: 'loan',
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
    <div className="p-6 space-y-6">
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
              Expense Details
            </h4>
          </div>
          <div className="space-y-3">
            {categoriesWithUncategorized.map((category) => {
              const categoryPersonalExpenses =
                category.categoryId === 'uncategorized'
                  ? uncategorizedExpenses
                  : personalExpenses.filter(
                      (exp) =>
                        exp.personalCategoryId === category.categoryId
                    );

              const categoryHouseholdExpenses =
                householdByCategory[category.categoryId] || [];

              const fixedTotal = categoryPersonalExpenses
                .filter((exp) => !exp.isBudgeted)
                .reduce((sum, exp) => sum + getMonthlyAmount(exp), 0);
              const budgetedTotal = categoryPersonalExpenses
                .filter((exp) => exp.isBudgeted)
                .reduce((sum, exp) => sum + getMonthlyAmount(exp), 0);
              const householdTotal = categoryHouseholdExpenses.reduce(
                (sum, exp) => sum + exp.userShareAmount,
                0
              );

              // Build a combined list: personal expenses keep their amount,
              // household expenses use the user's share as amount so sorting works.
              const householdExpenseIds = new Set(
                categoryHouseholdExpenses.map((e) => e.id)
              );
              const combinedExpenses: Expense[] = [
                ...categoryPersonalExpenses,
                ...categoryHouseholdExpenses.map((exp) => ({
                  ...exp,
                  amount: exp.userShareAmount,
                  isYearly: false,
                })),
              ];

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
                      <div className="text-sm font-medium">
                        {fixedTotal > 0 && (
                          <span className="text-gray-700">
                            {formatMoney(fixedTotal)} kr/month
                          </span>
                        )}
                        {budgetedTotal > 0 && (
                          <>
                            {fixedTotal > 0 && (
                              <span className="text-gray-400"> + </span>
                            )}
                            <span className="text-orange-600">
                              {formatMoney(budgetedTotal)} kr budgeted
                            </span>
                          </>
                        )}
                        {householdTotal > 0 && (
                          <>
                            {(fixedTotal > 0 || budgetedTotal > 0) && (
                              <span className="text-gray-400"> + </span>
                            )}
                            <span className="text-green-600">
                              {formatMoney(householdTotal)} kr household
                            </span>
                          </>
                        )}
                        {fixedTotal === 0 &&
                          budgetedTotal === 0 &&
                          householdTotal === 0 && (
                            <span className="text-lg font-semibold text-gray-900 whitespace-nowrap">
                              {formatMoney(category.amount)}&nbsp;kr
                            </span>
                          )}
                      </div>
                      <div className="text-sm text-gray-500">
                        {category.percentage > 0
                          ? `${category.percentage.toFixed(1)}% of income`
                          : ''}
                      </div>
                    </div>
                  </div>

                  {combinedExpenses.length > 0 && (
                    <div className="border-t border-gray-200 pt-3 mt-3">
                      <ExpenseList
                        expenses={combinedExpenses}
                        showSorting={combinedExpenses.length > 1}
                        variant="list"
                        renderExpenseItem={(expense, _index) => {
                          const isHousehold = householdExpenseIds.has(
                            expense.id
                          );
                          return (
                            <div className="text-sm px-2 py-1">
                              <div className="flex justify-between items-start sm:items-center">
                                <div className="flex items-center gap-2 text-left flex-1 min-w-0">
                                  <span className="font-medium truncate text-gray-700">
                                    {expense.name}
                                  </span>
                                </div>
                                <div className="flex items-center justify-end gap-2 w-48 flex-shrink-0">
                                  {isHousehold && (
                                    <span className="px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded-full whitespace-nowrap">
                                      household
                                    </span>
                                  )}
                                  {expense.isBudgeted && (
                                    <span className="px-2 py-0.5 text-xs bg-orange-100 text-orange-700 rounded-full whitespace-nowrap">
                                      budgeted
                                    </span>
                                  )}
                                  {!isHousehold && expense.isYearly && (
                                    <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded-full whitespace-nowrap">
                                      {getFrequencyText(expense)}
                                    </span>
                                  )}
                                  <span className="text-gray-500 whitespace-nowrap text-right w-20 flex-shrink-0">
                                    {formatMoney(
                                      getMonthlyAmount(expense)
                                    )}
                                    &nbsp;kr
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        }}
                      />
                    </div>
                  )}

                  {combinedExpenses.length === 0 && (
                    <div className="text-sm text-gray-400 italic pt-2">
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
