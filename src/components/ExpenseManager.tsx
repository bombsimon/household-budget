import { useState } from 'react';
import { Plus, ChevronDown, ChevronRight, Receipt } from 'lucide-react';
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
  const totalExpenses = fixedExpenses + budgetedExpenses;

  return (
    <div className="bg-white rounded-lg shadow-sm">
      <div className="p-3 sm:p-4 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-center gap-2 text-left flex-1 min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2 min-w-0 flex-1">
              <div className="flex items-center gap-2 min-w-0">
                <Receipt className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600 flex-shrink-0" />
                <h2 className="text-base font-semibold text-gray-900 leading-tight truncate">
                  Household Expenses
                </h2>
                <span className="text-sm text-gray-500 flex-shrink-0">
                  ({expenses.length})
                </span>
              </div>
              {totalExpenses > 0 && (
                <div className="text-sm font-medium mt-1 sm:mt-0">
                  <span className="text-gray-700">
                    {formatMoney(fixedExpenses)} kr/month
                  </span>
                  {budgetedExpenses > 0 && (
                    <>
                      <span className="text-gray-400"> + </span>
                      <span className="text-orange-600">
                        {formatMoney(budgetedExpenses)} kr budgeted
                      </span>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          <button
            onClick={() => setIsAdding(true)}
            className="hidden sm:flex items-center gap-1 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors flex-shrink-0"
          >
            <Plus className="w-4 h-4" />
            Add
          </button>
        </div>

        <div className="sm:hidden mt-2">
          <button
            onClick={() => setIsAdding(true)}
            className="w-full flex items-center justify-center gap-1 px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm"
          >
            <Plus className="w-4 h-4" />
            Add Expense
          </button>
        </div>
      </div>

      <div className="p-4">
        {isAdding && (
          <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
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
          <div className="text-center py-8 text-gray-500">
            <Receipt className="w-8 h-8 mx-auto mb-2 text-gray-300" />
            <p className="text-sm">No household expenses yet</p>
            <p className="text-xs text-gray-400">
              Click "Add" to create your first expense
            </p>
          </div>
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
    <div className="space-y-4">
      <div className="space-y-3">
        {categorySummaries.map((categoryInfo) => (
          <div
            key={categoryInfo.id}
            className="border border-gray-200 rounded-lg"
          >
            <div className="p-3 bg-gray-50 border-b border-gray-200">
              <button
                onClick={() => toggleCategoryCollapse(categoryInfo.id)}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between w-full text-left gap-2"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between min-w-0 flex-1 gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {categoryInfo.isCollapsed ? (
                      <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    )}
                    <h3 className="font-medium text-gray-900 leading-tight truncate">
                      {categoryInfo.name}
                    </h3>
                    <span className="text-sm text-gray-500 flex-shrink-0">
                      ({categoryInfo.count})
                    </span>
                  </div>

                  <div className="font-medium ml-6 sm:ml-0 sm:text-right sm:flex-shrink-0 text-sm">
                    {categoryInfo.fixedAmount > 0 && (
                      <span className="text-gray-700">
                        {formatMoney(categoryInfo.fixedAmount)} kr/month
                      </span>
                    )}
                    {categoryInfo.budgetedAmount > 0 && (
                      <>
                        {categoryInfo.fixedAmount > 0 && (
                          <span className="text-gray-400"> + </span>
                        )}
                        <span className="text-orange-600">
                          {formatMoney(categoryInfo.budgetedAmount)} kr budgeted
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </button>
            </div>

            {!categoryInfo.isCollapsed && (
              <div className="p-3">
                <ExpenseList
                  expenses={categoryInfo.expenses}
                  showSorting={true}
                  variant="card"
                  renderExpenseItem={(expense, _index) =>
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
                        personalCategories={personalCategories}
                        isEditing={false}
                        isSharedCategory={isSharedCategory}
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
          </div>
        ))}
      </div>
    </div>
  );
}
