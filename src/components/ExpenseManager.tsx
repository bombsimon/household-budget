import { useState } from 'react';
import { Plus, ChevronDown, ChevronRight } from 'lucide-react';
import type {
  User,
  Expense,
  ExpenseCategory,
  PersonalExpenseCategory,
} from '../types';
import { getMonthlyAmount, formatMoney } from '../utils/expenseCalculations';
import { ExpenseForm } from './ExpenseForm';
import { ExpenseItem } from './ExpenseItem';
import { ExpenseList } from './ExpenseList';

interface ExpenseManagerProps {
  users: User[];
  categories: ExpenseCategory[];
  personalCategories: PersonalExpenseCategory[];
  onAddExpense: (categoryId: string, expense: Omit<Expense, 'id'>) => void;
  onUpdateExpense: (expenseId: string, updates: Partial<Expense>) => void;
  onDeleteExpense: (expenseId: string) => void;
  onAddPersonalCategory: (name: string) => Promise<string>;
}

export function ExpenseManager({
  users,
  categories,
  personalCategories,
  onAddExpense,
  onUpdateExpense,
  onDeleteExpense,
  onAddPersonalCategory,
}: ExpenseManagerProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingExpense, setEditingExpense] = useState<string | null>(null);

  const sharedCategory = categories.find((cat) => cat.id === 'shared');
  const expenses = sharedCategory?.expenses || [];
  const fixedExpenses = expenses
    .filter((expense) => !expense.isBudgeted)
    .reduce((sum, expense) => sum + getMonthlyAmount(expense), 0);
  const budgetedExpenses = expenses
    .filter((expense) => expense.isBudgeted)
    .reduce((sum, expense) => sum + getMonthlyAmount(expense), 0);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="page-title">Household expenses</h1>
          {expenses.length > 0 && (
            <p className="money mt-1 text-ink-soft">
              <span className="text-3xl font-bold tracking-tight text-ink">
                {formatMoney(fixedExpenses)} kr
              </span>{' '}
              a month
              {budgetedExpenses > 0 && (
                <span className="block sm:inline">
                  {' '}
                  + {formatMoney(budgetedExpenses)} kr budgeted
                </span>
              )}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => setIsAdding(true)}
          className="btn-primary"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Add expense
        </button>
      </div>

      <div>
        {isAdding && (
          <div className="mb-6">
            <ExpenseForm
              users={users}
              personalCategories={personalCategories}
              isSharedCategory={true}
              category={sharedCategory || null}
              onSubmit={(expense) => {
                onAddExpense('shared', expense);
                setIsAdding(false);
              }}
              onCancel={() => setIsAdding(false)}
              onCreateCategory={onAddPersonalCategory}
            />
          </div>
        )}

        {expenses.length === 0 && !isAdding ? (
          <p className="panel p-8 text-ink-soft">
            No household expenses yet. Add rent, electricity, or anything else
            you share.
          </p>
        ) : expenses.length > 0 ? (
          <GroupedExpenses
            expenses={expenses}
            users={users}
            personalCategories={personalCategories}
            isSharedCategory={true}
            category={sharedCategory || null}
            editingExpense={editingExpense}
            onStartEdit={setEditingExpense}
            onStopEdit={() => setEditingExpense(null)}
            onUpdateExpense={onUpdateExpense}
            onDeleteExpense={onDeleteExpense}
            onAddPersonalCategory={onAddPersonalCategory}
          />
        ) : null}
      </div>
    </div>
  );
}

interface GroupedExpensesProps {
  expenses: Expense[];
  users: User[];
  personalCategories: PersonalExpenseCategory[];
  isSharedCategory: boolean;
  category: ExpenseCategory | null;
  editingExpense: string | null;
  onStartEdit: (expenseId: string) => void;
  onStopEdit: () => void;
  onUpdateExpense: (expenseId: string, updates: Partial<Expense>) => void;
  onDeleteExpense: (expenseId: string) => void;
  onAddPersonalCategory: (name: string) => Promise<string>;
}

function GroupedExpenses({
  expenses,
  users,
  personalCategories,
  isSharedCategory,
  category,
  editingExpense,
  onStartEdit,
  onStopEdit,
  onUpdateExpense,
  onDeleteExpense,
  onAddPersonalCategory,
}: GroupedExpensesProps) {
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(
    new Set()
  );

  const toggleCategoryCollapse = (categoryId: string) => {
    const newCollapsed = new Set(collapsedCategories);
    if (newCollapsed.has(categoryId)) {
      newCollapsed.delete(categoryId);
    } else {
      newCollapsed.add(categoryId);
    }
    setCollapsedCategories(newCollapsed);
  };

  const groupedExpenses = expenses.reduce(
    (groups, expense) => {
      const categoryId = expense.personalCategoryId || 'uncategorized';
      if (!groups[categoryId]) {
        groups[categoryId] = [];
      }
      groups[categoryId].push(expense);
      return groups;
    },
    {} as Record<string, Expense[]>
  );

  const categorySummaries = Object.entries(groupedExpenses)
    .map(([categoryId, categoryExpenses]) => {
      const cat = personalCategories.find((c) => c.id === categoryId);
      const categoryName = cat?.name || 'Uncategorized';
      const fixedAmount = categoryExpenses
        .filter((exp) => !exp.isBudgeted)
        .reduce((sum, exp) => sum + getMonthlyAmount(exp), 0);
      const budgetedAmount = categoryExpenses
        .filter((exp) => exp.isBudgeted)
        .reduce((sum, exp) => sum + getMonthlyAmount(exp), 0);

      return {
        id: categoryId,
        name: categoryName,
        expenses: categoryExpenses,
        fixedAmount,
        budgetedAmount,
        count: categoryExpenses.length,
        isCollapsed: collapsedCategories.has(categoryId),
      };
    })
    .sort((a, b) => {
      if (a.id === 'uncategorized' && b.id !== 'uncategorized') return 1;
      if (b.id === 'uncategorized' && a.id !== 'uncategorized') return -1;
      return a.name.localeCompare(b.name);
    });

  return (
    <div>
      <div className="space-y-5">
        {categorySummaries.map((categoryInfo) => (
          <section key={categoryInfo.id} className="panel overflow-hidden">
            <div className="bg-subtle px-5 py-3">
              <button
                type="button"
                aria-expanded={!categoryInfo.isCollapsed}
                onClick={() => toggleCategoryCollapse(categoryInfo.id)}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between w-full text-left gap-2"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between min-w-0 flex-1 gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {categoryInfo.isCollapsed ? (
                      <ChevronRight className="w-4 h-4 text-muted flex-shrink-0" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-muted flex-shrink-0" />
                    )}
                    <h2 className="section-title truncate">
                      {categoryInfo.name}
                    </h2>
                    <span className="text-sm text-muted flex-shrink-0">
                      ({categoryInfo.count})
                    </span>
                  </div>

                  <div className="font-medium ml-6 sm:ml-0 sm:text-right sm:flex-shrink-0 text-sm">
                    {categoryInfo.fixedAmount > 0 && (
                      <span className="text-ink-soft">
                        {formatMoney(categoryInfo.fixedAmount)} kr/month
                      </span>
                    )}
                    {categoryInfo.budgetedAmount > 0 && (
                      <>
                        {categoryInfo.fixedAmount > 0 && (
                          <span className="text-muted"> + </span>
                        )}
                        <span className="text-muted">
                          {formatMoney(categoryInfo.budgetedAmount)} kr budgeted
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </button>
            </div>

            {!categoryInfo.isCollapsed && (
              <div className="border-t border-line px-5 py-3">
                <ExpenseList
                  expenses={categoryInfo.expenses}
                  showSorting={true}
                  renderExpenseItem={(expense) =>
                    editingExpense === expense.id ? (
                      <ExpenseForm
                        users={users}
                        personalCategories={personalCategories}
                        isSharedCategory={isSharedCategory}
                        category={category}
                        initialData={expense}
                        onSubmit={(updates) => {
                          onUpdateExpense(expense.id, updates);
                          onStopEdit();
                        }}
                        onCancel={onStopEdit}
                        onCreateCategory={onAddPersonalCategory}
                      />
                    ) : (
                      <ExpenseItem
                        expense={expense}
                        users={users}
                        isEditing={false}
                        onUpdate={(updates) =>
                          onUpdateExpense(expense.id, updates)
                        }
                        onDelete={() => onDeleteExpense(expense.id)}
                        onStartEdit={() => onStartEdit(expense.id)}
                        onStopEdit={onStopEdit}
                      />
                    )
                  }
                />
              </div>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
