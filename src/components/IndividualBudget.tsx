import type {
  User,
  Expense,
  UserBudgetBreakdown,
  ExpenseCategory,
  Asset,
  Loan,
  PersonalExpenseCategory,
} from '../types';
import { useState } from 'react';
import { PieChart, Eye, EyeOff, Plus } from 'lucide-react';
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
import { InlineExpenseForm } from './InlineExpenseForm';

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

interface UserBudgetPageProps {
  user: User;
  breakdown: UserBudgetBreakdown;
  users: User[];
  categories: ExpenseCategory[];
  personalCategories: PersonalExpenseCategory[];
  assets: Asset[];
  loans: Loan[];
  onAddExpense: (categoryId: string, expense: Omit<Expense, 'id'>) => void;
  onUpdateExpense: (expenseId: string, updates: Partial<Expense>) => void;
  onDeleteExpense: (expenseId: string) => void;
  onAddPersonalCategory: (name: string) => Promise<string>;
}

export function UserBudgetPage({
  user,
  breakdown,
  users,
  categories,
  personalCategories,
  assets,
  loans,
  onAddExpense,
  onUpdateExpense,
  onDeleteExpense,
  onAddPersonalCategory,
}: UserBudgetPageProps) {
  const [blurSensitive, setBlurSensitive] = useState(false);

  const personalExpenses = categories
    .flatMap((cat) => cat.expenses)
    .filter((exp) => exp.userId === user.id && !exp.isShared);

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
            return total + getMonthlyAmount(exp) * exp.splitData[user.id];
          }
          return total;
        }, 0);
      return { name: asset.name, amount: allocation, type: 'fixed' };
    })
    .filter((asset) => asset.amount > 0);

  const totalInterestAllocation = loans.reduce((total, loan) => {
    if (!loan.isInterestShared) return total;
    const interestAmount = (loan.currentAmount * loan.interestRate) / 12;
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
    // Clamp at remaining balance — paid-off loans contribute 0.
    const monthlyAmortering = Math.min(
      loan.monthlyPayment,
      Math.max(0, loan.currentAmount)
    );
    if (loan.repaymentSplitType === 'equal') {
      return total + monthlyAmortering / users.length;
    } else if (
      loan.repaymentSplitType === 'percentage' &&
      loan.repaymentSplitData?.[user.id]
    ) {
      return total + monthlyAmortering * loan.repaymentSplitData[user.id];
    }
    return total;
  }, 0);

  const loanAllocations = [
    { name: 'Loan interests', amount: totalInterestAllocation },
    { name: 'Loan repayment', amount: totalRepaymentAllocation },
  ];

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">
          {user.name.split(' ')[0]}&apos;s Budget
        </h2>
        <button
          onClick={() => setBlurSensitive(!blurSensitive)}
          className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          title={blurSensitive ? 'Show sensitive data' : 'Hide sensitive data'}
        >
          {blurSensitive ? (
            <EyeOff className="w-4 h-4" />
          ) : (
            <Eye className="w-4 h-4" />
          )}
          {blurSensitive ? 'Show income' : 'Hide income'}
        </button>
      </div>

      <UserBudgetCard
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
        blurSensitive={blurSensitive}
        onAddExpense={onAddExpense}
        onUpdateExpense={onUpdateExpense}
        onDeleteExpense={onDeleteExpense}
        onAddPersonalCategory={onAddPersonalCategory}
      />
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
  blurSensitive: boolean;
  onAddExpense: (categoryId: string, expense: Omit<Expense, 'id'>) => void;
  onUpdateExpense: (expenseId: string, updates: Partial<Expense>) => void;
  onDeleteExpense: (expenseId: string) => void;
  onAddPersonalCategory: (name: string) => Promise<string>;
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
  blurSensitive,
  onAddExpense,
  onUpdateExpense,
  onDeleteExpense,
  onAddPersonalCategory,
}: UserBudgetCardProps) {
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [isAddingExpense, setIsAddingExpense] = useState(false);

  const sortedCategories = [...breakdown.personalExpenseBreakdown]
    .filter((cat) => cat.categoryId !== 'uncategorized')
    .sort((a, b) => a.categoryName.localeCompare(b.categoryName));

  const uncategorizedExpenses = personalExpenses.filter(
    (exp) => !exp.personalCategoryId
  );

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

  const householdByCategory = householdExpensesWithShare.reduce(
    (groups, exp) => {
      const catId = exp.personalCategoryId || 'uncategorized';
      if (!groups[catId]) groups[catId] = [];
      groups[catId].push(exp);
      return groups;
    },
    {} as Record<string, typeof householdExpensesWithShare>
  );

  const allCategoryIds = new Set<string>();
  personalExpenses.forEach((exp) => {
    allCategoryIds.add(exp.personalCategoryId || 'uncategorized');
  });
  householdExpensesWithShare.forEach((exp) => {
    allCategoryIds.add(exp.personalCategoryId || 'uncategorized');
  });

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

      const personalCat = sortedCategories.find((c) => c.categoryId === catId);
      let categoryName =
        existing?.categoryName ||
        personalCat?.categoryName ||
        (catId === 'uncategorized' ? 'Uncategorized' : catId);

      if (categoryName === catId && catId !== 'uncategorized') {
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
      if (a.categoryId === 'uncategorized' && b.categoryId !== 'uncategorized')
        return 1;
      if (b.categoryId === 'uncategorized' && a.categoryId !== 'uncategorized')
        return -1;
      return a.categoryName.localeCompare(b.categoryName);
    });

  const smallCategories = breakdown.personalExpenseBreakdown.filter(
    (category) => category.percentage <= 1 && category.amount <= 500
  );

  const otherPersonalAmount = smallCategories.reduce(
    (total, category) => total + category.amount,
    0
  );

  const chartData = [
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
    ...assetAllocations
      .filter((asset) => asset.amount > 0)
      .map((asset, index) => ({
        name: `${asset.name} (asset)`,
        value: (asset.amount / breakdown.income) * 100,
        amount: asset.amount,
        color: `hsl(${(index * 45 + 120) % 360}, 70%, 50%)`,
        type: 'asset',
      })),
    ...loanAllocations
      .filter((loan) => Math.abs(loan.amount) > 0)
      .map((loan) => ({
        name: loan.name,
        value: (Math.abs(loan.amount) / breakdown.income) * 100,
        amount: Math.abs(loan.amount),
        color: loan.name === 'Loan interests' ? '#F59E0B' : '#8B5CF6',
        type: 'loan',
      })),
    ...breakdown.personalExpenseBreakdown
      .filter((category) => category.percentage > 1 || category.amount > 500)
      .map((category, index) => ({
        name: category.categoryName,
        value: category.percentage,
        amount: category.amount,
        color: `hsl(${(index * 30 + 200) % 360}, 65%, 55%)`,
      })),
    ...(otherPersonalAmount > 0
      ? [
          {
            name: 'Other Personal',
            value: (otherPersonalAmount / breakdown.income) * 100,
            amount: otherPersonalAmount,
            color: '#9CA3AF',
            includedCategories: smallCategories,
          },
        ]
      : []),
  ].filter((item) => item.value > 0);

  const householdExpenseIds = new Set(
    householdExpensesWithShare.map((e) => e.id)
  );

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
        blurSensitive={blurSensitive}
      />

      {chartData.length > 1 && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
            <PieChart className="w-4 h-4" />
            Expense Breakdown by Category
          </h4>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
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
                        if (blurSensitive) {
                          return [`${formatMoney(item?.amount || 0)} kr`, name];
                        }
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
                        <div
                          className={`text-gray-500 text-xs ${blurSensitive ? 'blur-md select-none' : ''}`}
                        >
                          {item.value.toFixed(1)}%
                        </div>
                      </div>
                    </div>
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
            <button
              onClick={() => {
                setIsAddingExpense(true);
                setEditingExpenseId(null);
              }}
              className="flex items-center gap-1 px-2.5 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Add
            </button>
          </div>

          {isAddingExpense && (
            <div className="mb-3">
              <InlineExpenseForm
                personalCategories={personalCategories}
                onCreateCategory={onAddPersonalCategory}
                onSave={(data) => {
                  onAddExpense(`personal-${user.id}`, {
                    ...data,
                    isShared: false,
                    userId: user.id,
                    paidBy: user.id,
                    splitType: 'equal',
                  });
                  setIsAddingExpense(false);
                }}
                onCancel={() => setIsAddingExpense(false)}
              />
            </div>
          )}

          <div className="space-y-3">
            {categoriesWithUncategorized.map((category) => {
              const categoryPersonalExpenses =
                category.categoryId === 'uncategorized'
                  ? uncategorizedExpenses
                  : personalExpenses.filter(
                      (exp) => exp.personalCategoryId === category.categoryId
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
                      <div
                        className={`text-sm text-gray-500 ${blurSensitive ? 'blur-md select-none' : ''}`}
                      >
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

                          if (editingExpenseId === expense.id && !isHousehold) {
                            return (
                              <InlineExpenseForm
                                expense={expense}
                                personalCategories={personalCategories}
                                onCreateCategory={onAddPersonalCategory}
                                onSave={(data) => {
                                  onUpdateExpense(expense.id, data);
                                  setEditingExpenseId(null);
                                }}
                                onCancel={() => setEditingExpenseId(null)}
                                onDelete={() => {
                                  onDeleteExpense(expense.id);
                                  setEditingExpenseId(null);
                                }}
                              />
                            );
                          }

                          return (
                            <div
                              className={`text-sm px-2 py-1 ${!isHousehold ? 'cursor-pointer hover:bg-gray-50 rounded' : ''}`}
                              onClick={
                                !isHousehold
                                  ? () => {
                                      setEditingExpenseId(expense.id);
                                      setIsAddingExpense(false);
                                    }
                                  : undefined
                              }
                            >
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
                                    {formatMoney(getMonthlyAmount(expense))}
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

      {/* Show add button even when no categories exist yet */}
      {categoriesWithUncategorized.length === 0 && (
        <div>
          <div className="flex justify-between items-center mb-3">
            <h4 className="text-sm font-medium text-gray-700">
              Expense Details
            </h4>
            <button
              onClick={() => setIsAddingExpense(true)}
              className="flex items-center gap-1 px-2.5 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Add
            </button>
          </div>
          {isAddingExpense && (
            <div className="mb-3">
              <InlineExpenseForm
                personalCategories={personalCategories}
                onCreateCategory={onAddPersonalCategory}
                onSave={(data) => {
                  onAddExpense(`personal-${user.id}`, {
                    ...data,
                    isShared: false,
                    userId: user.id,
                    paidBy: user.id,
                    splitType: 'equal',
                  });
                  setIsAddingExpense(false);
                }}
                onCancel={() => setIsAddingExpense(false)}
              />
            </div>
          )}
          <div className="text-center py-6 text-gray-400 text-sm">
            No expenses yet. Click "Add" to create your first expense.
          </div>
        </div>
      )}
    </div>
  );
}
