import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  PieChart as PieChartIcon,
  BarChart3,
  ChevronDown,
  ChevronRight,
  Calculator,
} from 'lucide-react';
import React, { useState } from 'react';
import type {
  User,
  BudgetSummary,
  UserBudgetBreakdown,
  ExpenseCategory,
  Asset,
  Loan,
  Settlement,
} from '../types';
import { getMonthlyAmount, formatMoney } from '../utils/expenseCalculations';
import { BudgetBreakdownSummary } from './BudgetBreakdownSummary';

interface DashboardProps {
  users: User[];
  budgetSummary: BudgetSummary;
  userBreakdowns: UserBudgetBreakdown[];
  categories: ExpenseCategory[];
  assets: Asset[];
  loans: Loan[];
  settlements: Settlement[];
}

export function Dashboard({
  users,
  budgetSummary,
  userBreakdowns,
  categories,
  assets,
  loans,
  settlements,
}: DashboardProps) {
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());
  const [expandedLoans, setExpandedLoans] = useState<Set<string>>(new Set());

  const toggleUserExpanded = (userId: string) => {
    const newExpanded = new Set(expandedUsers);
    if (newExpanded.has(userId)) {
      newExpanded.delete(userId);
    } else {
      newExpanded.add(userId);
    }
    setExpandedUsers(newExpanded);
  };

  const toggleLoanExpanded = (loanId: string) => {
    const newExpanded = new Set(expandedLoans);
    if (newExpanded.has(loanId)) {
      newExpanded.delete(loanId);
    } else {
      newExpanded.add(loanId);
    }
    setExpandedLoans(newExpanded);
  };

  // Helper function to get uncategorized expenses for a user
  // const getUncategorizedExpenses = (userId: string) => {
  //   return categories
  //     .flatMap((cat) => cat.expenses)
  //     .filter(
  //       (expense) =>
  //         !expense.isShared &&
  //         expense.userId === userId &&
  //         !expense.personalCategoryId
  //     );
  // };
  // Helper function to get uncategorized expenses for a user

  const COLORS = [
    '#3B82F6',
    '#EF4444',
    '#10B981',
    '#F59E0B',
    '#8B5CF6',
    '#EC4899',
    '#06B6D4',
    '#84CC16',
  ];

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
        <MetricCard
          title="Total Income"
          value={budgetSummary.totalIncome}
          subtitle="Before taxes"
          color="text-blue-600"
          trend="up"
        />
        <MetricCard
          title="After Tax Income"
          value={budgetSummary.afterTaxIncome}
          subtitle={`${budgetSummary.totalIncome > 0 ? ((budgetSummary.afterTaxIncome / budgetSummary.totalIncome) * 100).toFixed(0) : '0'}% of gross`}
          color="text-green-600"
          trend="up"
        />
        <MetricCard
          title="Total Household Expenses"
          value={
            budgetSummary.totalSharedExpenses +
            budgetSummary.totalPersonalExpenses
          }
          subtitle={`Shared: ${formatMoney(budgetSummary.totalSharedExpenses)} kr + Personal: ${formatMoney(budgetSummary.totalPersonalExpenses)} kr`}
          color="text-red-600"
          trend="down"
        />
        <MetricCard
          title="Household Surplus"
          value={budgetSummary.remainingIncome}
          subtitle={`${budgetSummary.percentageRemaining.toFixed(1)}% of after-tax income`}
          color={
            budgetSummary.remainingIncome > 0
              ? 'text-green-600'
              : 'text-red-600'
          }
          trend={budgetSummary.remainingIncome > 0 ? 'up' : 'down'}
        />
      </div>

      {/* Household Financial Health & Insights */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          Household Financial Health & Insights
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Emergency Fund Status */}
          <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-5 h-5 text-blue-600" />
              <h4 className="font-semibold text-blue-900">
                Emergency Fund Status
              </h4>
            </div>
            {(() => {
              const monthlyExpenses =
                budgetSummary.totalSharedExpenses +
                budgetSummary.totalPersonalExpenses;
              const emergencyFundMonths =
                budgetSummary.remainingIncome > 0
                  ? Math.floor(
                      (budgetSummary.remainingIncome / monthlyExpenses) * 12
                    )
                  : 0;

              return (
                <div>
                  <div className="text-sm text-blue-800 mb-1">
                    Current monthly surplus covers
                  </div>
                  <div className="text-xl font-bold text-blue-900">
                    ~{emergencyFundMonths} months
                  </div>
                  <div className="text-xs text-blue-700 mt-1">
                    {emergencyFundMonths >= 6
                      ? '✅ Excellent emergency fund coverage'
                      : emergencyFundMonths >= 3
                        ? '⚠️ Good coverage, consider building to 6+ months'
                        : '🚨 Consider building emergency savings'}
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Debt-to-Income Analysis */}
          <div className="p-4 bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Calculator className="w-5 h-5 text-orange-600" />
              <h4 className="font-semibold text-orange-900">Debt Analysis</h4>
            </div>
            {(() => {
              const totalMonthlyDebtPayments = loans.reduce(
                (sum, loan) => sum + loan.monthlyPayment,
                0
              );
              const debtToIncomeRatio =
                budgetSummary.afterTaxIncome > 0
                  ? (totalMonthlyDebtPayments / budgetSummary.afterTaxIncome) *
                    100
                  : 0;

              return (
                <div>
                  <div className="text-sm text-orange-800 mb-1">
                    Debt payments vs after-tax income
                  </div>
                  <div className="text-xl font-bold text-orange-900">
                    {debtToIncomeRatio.toFixed(1)}%
                  </div>
                  <div className="text-xs text-orange-700 mt-1">
                    {debtToIncomeRatio === 0
                      ? '🎉 Debt-free household!'
                      : debtToIncomeRatio <= 20
                        ? '✅ Healthy debt-to-income ratio'
                        : debtToIncomeRatio <= 35
                          ? '⚠️ Moderate debt load'
                          : '🚨 High debt burden - consider debt reduction'}
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Savings Potential */}
          <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-5 h-5 text-green-600" />
              <h4 className="font-semibold text-green-900">
                Savings Potential
              </h4>
            </div>
            {(() => {
              const annualSavings = budgetSummary.remainingIncome * 12;
              const savingsRate =
                budgetSummary.afterTaxIncome > 0
                  ? (budgetSummary.remainingIncome /
                      budgetSummary.afterTaxIncome) *
                    100
                  : 0;

              return (
                <div>
                  <div className="text-sm text-green-800 mb-1">
                    Annual savings potential
                  </div>
                  <div className="text-xl font-bold text-green-900">
                    {formatMoney(annualSavings)} kr
                  </div>
                  <div className="text-xs text-green-700 mt-1">
                    {savingsRate >= 20
                      ? '🌟 Excellent savings rate!'
                      : savingsRate >= 10
                        ? '👍 Good savings discipline'
                        : savingsRate >= 5
                          ? '⚠️ Room for improvement'
                          : '🚨 Consider expense optimization'}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>

        {/* Key Recommendations */}
        <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <h4 className="font-semibold text-gray-900 mb-3">
            💡 Key Recommendations
          </h4>
          <div className="space-y-2 text-sm">
            {(() => {
              const recommendations = [];

              // Check savings rate
              if (budgetSummary.percentageRemaining < 10) {
                recommendations.push(
                  'Consider reviewing expenses to increase savings rate to at least 10%'
                );
              }

              // Check debt situation
              const totalDebt = loans.reduce(
                (sum, loan) => sum + loan.currentAmount,
                0
              );
              if (totalDebt > budgetSummary.afterTaxIncome * 3) {
                recommendations.push(
                  'Focus on debt reduction - total debt exceeds 3x annual after-tax income'
                );
              }

              // Check expense balance
              const expenseRatio =
                (budgetSummary.totalSharedExpenses /
                  (budgetSummary.totalSharedExpenses +
                    budgetSummary.totalPersonalExpenses)) *
                100;
              if (expenseRatio > 70) {
                recommendations.push(
                  'Consider reviewing household vs personal expense allocation'
                );
              }

              // Check settlement situation (only for multiple users)
              if (users.length > 1 && settlements.length > 2) {
                recommendations.push(
                  `Multiple settlements required (${settlements.length}) - consider simplifying expense sharing`
                );
              }

              if (recommendations.length === 0) {
                recommendations.push(
                  'Great job! Your household finances look well-balanced. Keep up the good work!'
                );
              }

              return recommendations.map((rec, index) => (
                <div key={index} className="flex items-start gap-2">
                  <span className="text-gray-400 mt-1">•</span>
                  <span className="text-gray-700">{rec}</span>
                </div>
              ));
            })()}
          </div>
        </div>
      </div>

      {/* User Breakdown Summary */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Individual Budget Summary
        </h3>
        <div className="overflow-x-auto table-responsive">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 sm:px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-3 sm:px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  After-Tax Income
                </th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Household Expenses
                </th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Personal Expenses
                </th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Remaining
                </th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  % Left
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {userBreakdowns.map((breakdown) => {
                const user = users.find((u) => u.id === breakdown.userId);
                const percentageLeft =
                  breakdown.income > 0
                    ? (breakdown.remainingAfterExpenses / breakdown.income) *
                      100
                    : 0;
                // const uncategorizedExpenses = getUncategorizedExpenses(
                //   breakdown.userId
                // );
                const isExpanded = expandedUsers.has(breakdown.userId);

                return (
                  <React.Fragment key={breakdown.userId}>
                    <tr>
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => toggleUserExpanded(breakdown.userId)}
                            className="p-1 text-gray-400 hover:text-gray-600"
                          >
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4" />
                            ) : (
                              <ChevronRight className="w-4 h-4" />
                            )}
                          </button>
                          <div
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: user?.color }}
                          />
                          <span className="text-sm font-medium text-gray-900">
                            {user?.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatMoney(breakdown.income)} kr
                      </td>
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-red-600">
                        {formatMoney(breakdown.sharedExpensesOwed)} kr
                      </td>
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-orange-600">
                        {formatMoney(breakdown.personalExpenses)} kr
                      </td>
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm">
                        <span
                          className={
                            breakdown.remainingAfterExpenses > 0
                              ? 'text-green-600'
                              : 'text-red-600'
                          }
                        >
                          {formatMoney(breakdown.remainingAfterExpenses)} kr
                        </span>
                      </td>
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm">
                        <span
                          className={
                            percentageLeft > 0
                              ? 'text-green-600'
                              : 'text-red-600'
                          }
                        >
                          {percentageLeft.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                    {isExpanded && user && (
                      <tr key={`${breakdown.userId}-details`}>
                        <td
                          colSpan={6}
                          className="px-3 sm:px-6 py-4 bg-gray-50"
                        >
                          <div className="max-w-4xl">
                            <h4 className="text-sm font-medium text-gray-900 mb-3">
                              Budget Breakdown for {user.name}:
                            </h4>
                            <BudgetBreakdownSummary
                              user={user}
                              breakdown={breakdown}
                              categories={categories}
                              assets={assets}
                              loans={loans}
                              users={users}
                              compact={true}
                            />
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Household Budget Overview Chart */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Household Budget Overview
          </h3>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart
              data={[
                {
                  category: 'Total',
                  income: budgetSummary.afterTaxIncome,
                  sharedExpenses: budgetSummary.totalSharedExpenses,
                  personalExpenses: budgetSummary.totalPersonalExpenses,
                  remaining: budgetSummary.remainingIncome,
                },
              ]}
              margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="category" />
              <YAxis
                tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip
                formatter={(value: number, name: string) => [
                  `${formatMoney(value)} kr`,
                  name,
                ]}
                labelFormatter={() => 'Household Budget'}
              />
              <Legend />
              <Bar dataKey="income" fill="#3B82F6" name="After-Tax Income" />
              <Bar
                dataKey="sharedExpenses"
                fill="#EF4444"
                name="Household Expenses"
              />
              <Bar
                dataKey="personalExpenses"
                fill="#F59E0B"
                name="Personal Expenses"
              />
              <Bar dataKey="remaining" fill="#10B981" name="Surplus" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Spending Categories Chart */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <PieChartIcon className="w-5 h-5" />
            Household Spending by Category
          </h3>
          {(() => {
            // Calculate household totals by category (combining all expenses regardless of who pays)
            const categoryTotals: Array<{
              name: string;
              amount: number;
              color?: string;
            }> = [];

            categories.forEach((category) => {
              if (category.id === 'shared') {
                // For shared expenses, sum all expenses
                const totalAmount = category.expenses.reduce(
                  (sum, exp) => sum + getMonthlyAmount(exp),
                  0
                );
                if (totalAmount > 0) {
                  categoryTotals.push({
                    name: 'Household Expenses',
                    amount: totalAmount,
                    color: '#3B82F6',
                  });
                }
              } else {
                // For personal categories, sum all expenses
                const totalAmount = category.expenses.reduce(
                  (sum, exp) => sum + getMonthlyAmount(exp),
                  0
                );
                if (totalAmount > 0) {
                  categoryTotals.push({
                    name: category.name,
                    amount: totalAmount,
                  });
                }
              }
            });

            const totalSpending = categoryTotals.reduce(
              (sum, cat) => sum + cat.amount,
              0
            );
            const minThreshold = 0.05; // 5% minimum

            const majorCategories = categoryTotals.filter(
              (cat) => cat.amount / totalSpending >= minThreshold
            );

            const minorCategories = categoryTotals.filter(
              (cat) => cat.amount / totalSpending < minThreshold
            );

            const chartData = [...majorCategories];
            if (minorCategories.length > 0) {
              const otherAmount = minorCategories.reduce(
                (sum, cat) => sum + cat.amount,
                0
              );
              chartData.push({
                name: `Other (${minorCategories.length} categories)`,
                amount: otherAmount,
                color: '#9CA3AF',
              });
            }

            return (
              <>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={120}
                      paddingAngle={2}
                      dataKey="amount"
                    >
                      {chartData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.color || COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) => [
                        `${formatMoney(value)} kr`,
                        'Monthly spending',
                      ]}
                    />
                  </PieChart>
                </ResponsiveContainer>

                <div className="mt-6 space-y-2">
                  <h4 className="text-sm font-medium text-gray-800 mb-3">
                    Category Breakdown ({formatMoney(totalSpending)} kr total)
                  </h4>
                  {chartData.map((category, index) => {
                    const percentage =
                      totalSpending > 0
                        ? (category.amount / totalSpending) * 100
                        : 0;
                    return (
                      <div
                        key={category.name}
                        className="flex items-center justify-between p-2 hover:bg-gray-50 rounded"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{
                              backgroundColor:
                                category.color || COLORS[index % COLORS.length],
                            }}
                          />
                          <span className="text-sm font-medium text-gray-700">
                            {category.name}
                          </span>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-semibold text-gray-900">
                            {formatMoney(category.amount)} kr
                          </div>
                          <div className="text-xs text-gray-500">
                            {percentage.toFixed(1)}%
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            );
          })()}
        </div>
      </div>

      {/* Loans Summary Panel */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <TrendingDown className="w-5 h-5" />
          Loans Overview
        </h3>
        {loans.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {loans.length}
              </div>
              <div className="text-sm text-gray-500">Active Loans</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {formatMoney(
                  loans.reduce((sum, loan) => sum + loan.currentAmount, 0)
                )}{' '}
                kr
              </div>
              <div className="text-sm text-gray-500">Total Remaining Debt</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {formatMoney(
                  loans.reduce((sum, loan) => sum + loan.monthlyPayment, 0)
                )}{' '}
                kr
              </div>
              <div className="text-sm text-gray-500">Monthly Payments</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {formatMoney(
                  loans.reduce(
                    (sum, loan) => sum + loan.currentAmount * loan.interestRate,
                    0
                  )
                )}{' '}
                kr
              </div>
              <div className="text-sm text-gray-500">Annual Interest</div>
            </div>
          </div>
        ) : (
          <p className="text-gray-500 text-center py-8">
            No loans configured. Add loans to see debt overview.
          </p>
        )}

        {loans.length > 0 && (
          <div className="mt-6">
            <h4 className="text-md font-medium text-gray-800 mb-3">
              Loan Details
            </h4>
            <div className="space-y-3">
              {loans.map((loan) => {
                const monthlyInterest =
                  (loan.currentAmount * loan.interestRate) / 12;
                const payerUser = users.find((u) => u.id === loan.paidBy);
                const progressPercentage =
                  ((loan.originalAmount - loan.currentAmount) /
                    loan.originalAmount) *
                  100;
                const isExpanded = expandedLoans.has(loan.id);

                return (
                  <div key={loan.id} className="bg-gray-50 rounded-lg">
                    <button
                      onClick={() => toggleLoanExpanded(loan.id)}
                      className="w-full p-4 flex items-center justify-between hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-gray-400" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-gray-400" />
                        )}
                        <div className="text-left">
                          <div className="font-medium text-gray-900">
                            {loan.name}
                          </div>
                          <div className="text-sm text-gray-600">
                            {(loan.interestRate * 100).toFixed(2)}% interest
                            {payerUser && users.length > 1 && (
                              <span className="ml-2 px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-full">
                                Paid by {payerUser.name}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-gray-900">
                          {formatMoney(loan.currentAmount)} kr
                        </div>
                        <div className="text-xs text-gray-500">remaining</div>
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="px-4 pb-4">
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <div className="text-gray-500">Monthly Payment</div>
                            <div className="font-medium">
                              {formatMoney(loan.monthlyPayment)} kr
                            </div>
                          </div>
                          <div>
                            <div className="text-gray-500">
                              Monthly Interest
                            </div>
                            <div className="font-medium">
                              {formatMoney(monthlyInterest)} kr
                            </div>
                          </div>
                          <div>
                            <div className="text-gray-500">Progress</div>
                            <div className="font-medium">
                              {progressPercentage.toFixed(1)}% paid
                            </div>
                          </div>
                        </div>

                        <div className="mt-2">
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-green-600 h-2 rounded-full transition-all duration-300"
                              style={{
                                width: `${Math.min(progressPercentage, 100)}%`,
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Assets Summary Panel */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <DollarSign className="w-5 h-5" />
          Assets Overview
        </h3>
        {assets.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {assets.length}
              </div>
              <div className="text-sm text-gray-500">Assets</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {formatMoney(
                  assets.reduce(
                    (total, asset) =>
                      total +
                      asset.fixedCosts.reduce(
                        (sum, cost) => sum + getMonthlyAmount(cost),
                        0
                      ),
                    0
                  )
                )}{' '}
                kr
              </div>
              <div className="text-sm text-gray-500">Monthly Fixed Costs</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {formatMoney(
                  assets.reduce(
                    (total, asset) =>
                      total +
                      asset.variableCosts.reduce(
                        (sum, cost) => sum + getMonthlyAmount(cost),
                        0
                      ),
                    0
                  )
                )}{' '}
                kr
              </div>
              <div className="text-sm text-gray-500">
                Monthly Variable Costs
              </div>
            </div>
          </div>
        ) : (
          <p className="text-gray-500 text-center py-8">
            No assets configured yet. Add assets to see cost breakdown.
          </p>
        )}

        {assets.length > 0 && (
          <div className="mt-6">
            <h4 className="text-md font-medium text-gray-800 mb-3">
              Asset Details
            </h4>
            <div className="space-y-3">
              {assets.map((asset) => {
                const fixedCostTotal = asset.fixedCosts.reduce(
                  (sum, cost) => sum + getMonthlyAmount(cost),
                  0
                );
                const variableCostTotal = asset.variableCosts.reduce(
                  (sum, cost) => sum + getMonthlyAmount(cost),
                  0
                );
                const totalCost = fixedCostTotal + variableCostTotal;

                return (
                  <div
                    key={asset.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="text-left">
                      <div className="font-medium text-gray-900">
                        {asset.name}
                      </div>
                      <div className="text-sm text-gray-600">
                        Fixed: {formatMoney(fixedCostTotal)} kr • Variable:{' '}
                        {formatMoney(variableCostTotal)} kr
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-gray-900">
                        {formatMoney(totalCost)} kr
                      </div>
                      <div className="text-xs text-gray-500">per month</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Settlement Summary Panel - Only show if more than 1 user */}
      {users.length > 1 && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <PieChartIcon className="w-5 h-5" />
            Settlement Overview
          </h3>
          {settlements.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {settlements.length}
                </div>
                <div className="text-sm text-gray-500">
                  Required Settlements
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {formatMoney(
                    settlements.reduce(
                      (sum, settlement) => sum + settlement.amount,
                      0
                    )
                  )}{' '}
                  kr
                </div>
                <div className="text-sm text-gray-500">
                  Total Settlement Amount
                </div>
              </div>
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">
              All expenses are balanced! No settlements required.
            </p>
          )}

          {settlements.length > 0 && (
            <div className="mt-6">
              <h4 className="text-md font-medium text-gray-800 mb-3">
                Settlement Details
              </h4>
              <div className="space-y-3">
                {settlements.map((settlement, index) => {
                  const fromUser = users.find((u) => u.id === settlement.from);
                  const toUser = users.find((u) => u.id === settlement.to);

                  return (
                    <div
                      key={`${settlement.from}-${settlement.to}-${index}`}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
                        <div className="flex items-center gap-2 min-w-0">
                          <div
                            className="w-4 h-4 rounded-full flex-shrink-0"
                            style={{
                              backgroundColor: fromUser?.color || '#666',
                            }}
                          />
                          <span className="font-medium text-gray-900 truncate">
                            {fromUser?.name || 'Unknown'}
                          </span>
                        </div>

                        <div className="flex items-center gap-1 sm:gap-2 text-gray-500 flex-shrink-0">
                          <ChevronRight className="w-4 h-4" />
                        </div>

                        <div className="flex items-center gap-2 min-w-0">
                          <div
                            className="w-4 h-4 rounded-full flex-shrink-0"
                            style={{ backgroundColor: toUser?.color || '#666' }}
                          />
                          <span className="font-medium text-gray-900 truncate">
                            {toUser?.name || 'Unknown'}
                          </span>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="font-semibold text-green-600">
                          {formatMoney(settlement.amount)} kr
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {settlements.length > 0 && (
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>💡 Tip:</strong> Complete these settlements to
                    balance all shared expenses fairly according to income or
                    agreed splits.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface MetricCardProps {
  title: string;
  value: number;
  subtitle: string;
  color: string;
  trend: 'up' | 'down';
}

function MetricCard({ title, value, subtitle, color, trend }: MetricCardProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm p-3 sm:p-6 min-w-0 text-center">
      <div className="flex flex-col items-center mb-2">
        <h3 className="text-xs sm:text-sm font-medium text-gray-500 leading-tight mb-1">
          {title}
        </h3>
        {trend === 'up' ? (
          <TrendingUp
            className={`w-3 h-3 sm:w-4 sm:h-4 ${color} flex-shrink-0`}
          />
        ) : (
          <TrendingDown
            className={`w-3 h-3 sm:w-4 sm:h-4 ${color} flex-shrink-0`}
          />
        )}
      </div>
      <div
        className={`text-lg sm:text-2xl font-bold ${color} leading-tight mb-1`}
      >
        {formatMoney(value)} kr
      </div>
      <div className="text-xs sm:text-sm text-gray-500 leading-tight">
        {subtitle}
      </div>
    </div>
  );
}
