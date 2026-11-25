import type {
  User,
  Expense,
  UserBudgetBreakdown,
  ExpenseCategory,
  Asset,
  PersonalExpenseCategory,
} from '../types';
import { useState } from 'react';
import { Eye, EyeOff, Plus } from 'lucide-react';
import { getMonthlyAmount, formatMoney } from '../utils/expenseCalculations';
import { getExpenseCostForUser } from '../utils/costAllocation';
import { Avatar } from './Avatar';
import { CostDonut, CostLegend, type CostPart } from './CostCharts';
import { COST_COLORS } from '../utils/costColors';
import { assignToColumns } from '../utils/assignToColumns';
import { BudgetBreakdownSummary } from './BudgetBreakdownSummary';
import { ExpenseList } from './ExpenseList';
import { InlineExpenseForm } from './InlineExpenseForm';

interface UserBudgetPageProps {
  user: User;
  breakdown: UserBudgetBreakdown;
  users: User[];
  categories: ExpenseCategory[];
  personalCategories: PersonalExpenseCategory[];
  assets: Asset[];
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
  onAddExpense,
  onUpdateExpense,
  onDeleteExpense,
  onAddPersonalCategory,
}: UserBudgetPageProps) {
  const [blurSensitive, setBlurSensitive] = useState(false);

  const personalExpenses = categories
    .flatMap((cat) => cat.expenses)
    .filter((exp) => exp.userId === user.id && !exp.isShared);

  return (
    <div>
      <div className="mb-5 flex items-center justify-between gap-3">
        <h1 className="page-title flex min-w-0 items-center gap-3">
          <Avatar user={user} size="medium" />
          <span>{user.name.split(' ')[0]}&apos;s budget</span>
        </h1>
        <button
          onClick={() => setBlurSensitive(!blurSensitive)}
          className="btn-secondary flex-shrink-0"
          type="button"
          aria-label={blurSensitive ? 'Show income' : 'Hide income'}
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
        categories={categories}
        assets={assets}
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
  personalExpenses: Expense[];
  personalCategories: PersonalExpenseCategory[];
  categories: ExpenseCategory[];
  assets: Asset[];
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
  categories,
  assets,
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
        .map((exp) => ({
          ...exp,
          userShareAmount: getExpenseCostForUser(exp, users, user.id),
        }))
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

  const costParts: CostPart[] = [
    {
      label: 'Household expenses',
      amount: breakdown.householdExpenses,
      color: COST_COLORS.household,
    },
    {
      label: 'Loan interest',
      amount: breakdown.loanInterest,
      color: COST_COLORS.loanInterest,
    },
    {
      label: 'Loan repayment',
      amount: breakdown.loanRepayment,
      color: COST_COLORS.loanRepayment,
    },
    {
      label: 'Assets',
      amount: breakdown.assetCosts.reduce(
        (sum, asset) => sum + asset.amount,
        0
      ),
      color: COST_COLORS.assets,
    },
    {
      label: 'Personal expenses',
      amount: breakdown.personalExpenses,
      color: COST_COLORS.personal,
    },
  ];
  const personalBySize = [...breakdown.personalExpenseBreakdown].sort(
    (a, b) => b.amount - a.amount
  );

  // A panel's heading takes about as much space as three expense rows
  const categoryColumns = assignToColumns(
    categoriesWithUncategorized.map(
      (category) =>
        3 +
        (category.categoryId === 'uncategorized'
          ? uncategorizedExpenses
          : personalExpenses.filter(
              (expense) => expense.personalCategoryId === category.categoryId
            )
        ).length +
        (householdByCategory[category.categoryId] || []).length
    )
  );

  const householdExpenseIds = new Set(
    householdExpensesWithShare.map((e) => e.id)
  );

  return (
    <div className="space-y-5">
      <section className="panel flex flex-wrap items-end justify-between gap-6 p-6">
        <div>
          <h2 className="section-title">Left each month</h2>
          <p
            className={`mt-1 whitespace-nowrap text-4xl font-bold tracking-tight text-accent-ink sm:text-5xl ${blurSensitive ? 'select-none blur-lg' : ''}`}
            aria-hidden={blurSensitive}
          >
            {formatMoney(breakdown.remainingAfterExpenses)} kr
          </p>
        </div>
        <dl className="flex gap-8">
          <div>
            <dt className="text-sm text-muted">After tax</dt>
            <dd
              className={`money font-semibold ${blurSensitive ? 'select-none blur-md' : ''}`}
            >
              {formatMoney(breakdown.income)} kr
            </dd>
          </div>
          <div>
            <dt className="text-sm text-muted">Costs</dt>
            <dd className="money font-semibold">
              {formatMoney(
                breakdown.sharedExpensesOwed + breakdown.personalExpenses
              )}{' '}
              kr
            </dd>
          </div>
        </dl>
      </section>

      <div className="grid items-start gap-5 lg:grid-cols-2 [&>*]:min-w-0">
        <section className="panel p-6">
          <h2 className="section-title mb-4">Monthly statement</h2>
          <BudgetBreakdownSummary
            user={user}
            breakdown={breakdown}
            categories={categories}
            assets={assets}
            users={users}
            blurSensitive={blurSensitive}
          />
        </section>

        {costParts.some((part) => part.amount > 0) && (
          <section className="panel p-6">
            <h2 className="section-title mb-4">Where the costs go</h2>
            <CostDonut parts={costParts} />
            <div className="mt-5">
              <CostLegend parts={costParts} />
            </div>
            {breakdown.personalExpenseBreakdown.length > 0 && (
              <div className="mt-6 border-t border-line pt-5">
                <h3 className="mb-3 font-semibold">Personal, by category</h3>
                <ul className="space-y-3 text-sm">
                  {personalBySize.map((category) => (
                    <li key={category.categoryId}>
                      <span className="flex justify-between gap-4">
                        <span>{category.categoryName}</span>
                        <span className="money font-semibold">
                          {formatMoney(category.amount)} kr
                        </span>
                      </span>
                      <span
                        aria-hidden="true"
                        className="mt-1 block h-2 rounded-r"
                        style={{
                          width: `${(category.amount / personalBySize[0].amount) * 100}%`,
                          backgroundColor: COST_COLORS.personal,
                        }}
                      />
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        )}
      </div>

      {/* Personal Expense Categories Detail */}
      {categoriesWithUncategorized.length > 0 && (
        <div>
          <div className="flex justify-between items-center mb-3">
            <h2 className="section-title">Expenses</h2>
            <button
              onClick={() => {
                setIsAddingExpense(true);
                setEditingExpenseId(null);
              }}
              type="button"
              className="btn-primary"
            >
              <Plus className="w-3.5 h-3.5" />
              Add expense
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

          {/* Floats pack uneven panels while keeping them in reading order */}
          <div className="-mb-5 flow-root">
            {categoriesWithUncategorized.map((category, categoryIndex) => {
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
                  className={`panel mb-5 p-5 lg:w-[calc(50%-0.625rem)] ${
                    categoryColumns[categoryIndex] === 'left'
                      ? 'lg:float-left lg:clear-left'
                      : 'lg:float-right lg:clear-right'
                  }`}
                >
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="section-title">{category.categoryName}</h3>
                    <div className="text-right">
                      <div className="text-sm font-medium">
                        {fixedTotal > 0 && (
                          <span className="text-ink-soft">
                            {formatMoney(fixedTotal)} kr/month
                          </span>
                        )}
                        {budgetedTotal > 0 && (
                          <>
                            {fixedTotal > 0 && (
                              <span className="text-muted"> + </span>
                            )}
                            <span className="text-muted">
                              {formatMoney(budgetedTotal)} kr budgeted
                            </span>
                          </>
                        )}
                        {householdTotal > 0 && (
                          <>
                            {(fixedTotal > 0 || budgetedTotal > 0) && (
                              <span className="text-muted"> + </span>
                            )}
                            <span className="text-muted">
                              {formatMoney(householdTotal)} kr household
                            </span>
                          </>
                        )}
                        {fixedTotal === 0 &&
                          budgetedTotal === 0 &&
                          householdTotal === 0 && (
                            <span className="text-lg font-semibold text-ink whitespace-nowrap">
                              {formatMoney(category.amount)}&nbsp;kr
                            </span>
                          )}
                      </div>
                      <div
                        className={`text-sm text-muted ${blurSensitive ? 'blur-md select-none' : ''}`}
                      >
                        {category.percentage > 0
                          ? `${category.percentage.toFixed(1)}% of income`
                          : ''}
                      </div>
                    </div>
                  </div>

                  {combinedExpenses.length > 0 && (
                    <div className="border-t border-line pt-2">
                      <ExpenseList
                        expenses={combinedExpenses}
                        showSorting={combinedExpenses.length > 1}
                        renderExpenseItem={(expense) => {
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

                          const content = (
                            <span className="flex w-full flex-wrap items-baseline justify-between gap-x-4 px-2 py-2 text-left">
                              <span className="min-w-0 break-words">
                                {expense.name}
                                {isHousehold && (
                                  <span className="tag ml-2 bg-success-tag text-success-ink">
                                    your share
                                  </span>
                                )}
                                {expense.isBudgeted && (
                                  <span className="tag ml-2 bg-warning-tag text-warning-ink">
                                    budgeted
                                  </span>
                                )}
                                {!isHousehold && expense.isYearly && (
                                  <span className="tag ml-2 bg-accent-tag text-accent-ink-strong">
                                    paid yearly
                                  </span>
                                )}
                              </span>
                              <span className="money ml-auto">
                                {formatMoney(getMonthlyAmount(expense))} kr
                              </span>
                            </span>
                          );

                          if (isHousehold) return content;

                          return (
                            <button
                              type="button"
                              aria-label={`Edit ${expense.name}, ${formatMoney(getMonthlyAmount(expense))} kr`}
                              className="block w-full rounded-lg hover:bg-accent-soft"
                              onClick={() => {
                                setEditingExpenseId(expense.id);
                                setIsAddingExpense(false);
                              }}
                            >
                              {content}
                            </button>
                          );
                        }}
                      />
                    </div>
                  )}

                  {combinedExpenses.length === 0 && (
                    <div className="text-sm text-muted italic pt-2">
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
            <h2 className="section-title">Expenses</h2>
            <button
              onClick={() => setIsAddingExpense(true)}
              type="button"
              className="btn-primary"
            >
              <Plus className="w-3.5 h-3.5" />
              Add expense
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
          <div className="text-ink-soft">No expenses yet.</div>
        </div>
      )}
    </div>
  );
}
