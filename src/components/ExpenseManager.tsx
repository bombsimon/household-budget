import { useState } from 'react';
import { Plus, ChevronDown, ChevronRight, Receipt } from 'lucide-react';
import type {
  User,
  Expense,
  ExpenseCategory,
  PersonalExpenseCategory,
} from '../types';
import { PersonalCategoryManager } from './PersonalCategoryManager';
import { getMonthlyAmount, formatMoney } from '../utils/expenseCalculations';
import { ExpenseForm } from './ExpenseForm';
import { ExpenseItem } from './ExpenseItem';
import { ExpenseList } from './ExpenseList';

interface ExpenseManagerProps {
  users: User[];
  categories: ExpenseCategory[];
  personalCategories: PersonalExpenseCategory[];
  personalCategoriesSectionCollapsed: boolean;
  onAddExpense: (categoryId: string, expense: Omit<Expense, 'id'>) => void;
  onUpdateExpense: (expenseId: string, updates: Partial<Expense>) => void;
  onDeleteExpense: (expenseId: string) => void;
  onToggleCategoryCollapse: (categoryId: string) => void;
  onAddPersonalCategory: (name: string) => void;
  onUpdatePersonalCategory: (
    categoryId: string,
    updates: Partial<PersonalExpenseCategory>
  ) => void;
  onDeletePersonalCategory: (categoryId: string) => void;
  onTogglePersonalCategoryCollapse: (categoryId: string) => void;
  onTogglePersonalCategoriesSectionCollapse: () => void;
}

export function ExpenseManager({
  users,
  categories,
  personalCategories,
  personalCategoriesSectionCollapsed,
  onAddExpense,
  onUpdateExpense,
  onDeleteExpense,
  onToggleCategoryCollapse,
  onAddPersonalCategory,
  onUpdatePersonalCategory,
  onDeletePersonalCategory,
  onTogglePersonalCategoryCollapse,
  onTogglePersonalCategoriesSectionCollapse,
}: ExpenseManagerProps) {
  const [addingToCategory, setAddingToCategory] = useState<string | null>(null);
  const [editingExpense, setEditingExpense] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <PersonalCategoryManager
        personalCategories={personalCategories}
        personalCategoriesSectionCollapsed={personalCategoriesSectionCollapsed}
        onAddPersonalCategory={onAddPersonalCategory}
        onUpdatePersonalCategory={onUpdatePersonalCategory}
        onDeletePersonalCategory={onDeletePersonalCategory}
        onTogglePersonalCategoryCollapse={onTogglePersonalCategoryCollapse}
        onTogglePersonalCategoriesSectionCollapse={
          onTogglePersonalCategoriesSectionCollapse
        }
      />

      <div className="space-y-6">
        {[...categories]
          .sort((a, b) => {
            // Keep 'shared' category first, then sort others alphabetically
            if (a.id === 'shared') return -1;
            if (b.id === 'shared') return 1;
            return a.name.localeCompare(b.name);
          })
          .map((category) => {
            const isSharedCategory = category.id === 'shared';
            const isPersonalCategory = category.id.startsWith('personal-');
            const fixedExpenses = category.expenses
              .filter((expense) => !expense.isBudgeted)
              .reduce((sum, expense) => sum + getMonthlyAmount(expense), 0);
            const budgetedExpenses = category.expenses
              .filter((expense) => expense.isBudgeted)
              .reduce((sum, expense) => sum + getMonthlyAmount(expense), 0);
            const totalExpenses = fixedExpenses + budgetedExpenses;

            return (
              <div key={category.id} className="bg-white rounded-lg shadow-sm">
                <div className="p-3 sm:p-4 border-b border-gray-200">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    {/* Mobile: 3-row layout, Desktop: single row */}
                    <button
                      onClick={() => onToggleCategoryCollapse(category.id)}
                      className="flex items-center gap-2 text-left flex-1 min-w-0"
                    >
                      {category.collapsed ? (
                        <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 flex-shrink-0" />
                      ) : (
                        <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 flex-shrink-0" />
                      )}
                      <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2 min-w-0 flex-1">
                        <div className="flex items-center gap-2 min-w-0">
                          <Receipt className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600 flex-shrink-0" />
                          <h2 className="text-base font-semibold text-gray-900 leading-tight truncate">
                            {category.name}
                          </h2>
                          <span className="text-sm text-gray-500 flex-shrink-0">
                            ({category.expenses.length})
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
                    </button>

                    {/* Desktop: inline button */}
                    <button
                      onClick={() => setAddingToCategory(category.id)}
                      className="hidden sm:flex items-center gap-1 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors flex-shrink-0"
                    >
                      <Plus className="w-4 h-4" />
                      Add
                    </button>
                  </div>

                  {/* Mobile: Add button on separate row - hide when collapsed */}
                  {!category.collapsed && (
                    <div className="sm:hidden mt-2">
                      <button
                        onClick={() => setAddingToCategory(category.id)}
                        className="w-full flex items-center justify-center gap-1 px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm"
                      >
                        <Plus className="w-4 h-4" />
                        Add Expense
                      </button>
                    </div>
                  )}
                </div>

                {!category.collapsed && (
                  <div className="p-4">
                    {addingToCategory === category.id && (
                      <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <ExpenseForm
                          users={users}
                          personalCategories={personalCategories}
                          isSharedCategory={isSharedCategory}
                          category={category}
                          onSubmit={(expense) => {
                            onAddExpense(category.id, expense);
                            setAddingToCategory(null);
                          }}
                          onCancel={() => setAddingToCategory(null)}
                        />
                      </div>
                    )}

                    {category.expenses.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <Receipt className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                        <p className="text-sm">No expenses in this category</p>
                        <p className="text-xs text-gray-400">
                          Click "Add" to create your first expense
                        </p>
                      </div>
                    ) : isPersonalCategory ? (
                      <GroupedPersonalExpenses
                        expenses={category.expenses}
                        users={users}
                        personalCategories={personalCategories}
                        editingExpense={editingExpense}
                        onStartEdit={setEditingExpense}
                        onStopEdit={() => setEditingExpense(null)}
                        onUpdateExpense={onUpdateExpense}
                        onDeleteExpense={onDeleteExpense}
                      />
                    ) : (
                      <ExpenseList
                        expenses={category.expenses}
                        showSorting={isSharedCategory}
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
                                setEditingExpense(null);
                              }}
                              onCancel={() => setEditingExpense(null)}
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
                              onStartEdit={() => setEditingExpense(expense.id)}
                              onStopEdit={() => setEditingExpense(null)}
                            />
                          )
                        }
                      />
                    )}
                  </div>
                )}
              </div>
            );
          })}
      </div>
    </div>
  );
}

interface GroupedPersonalExpensesProps {
  expenses: Expense[];
  users: User[];
  personalCategories: PersonalExpenseCategory[];
  editingExpense: string | null;
  onStartEdit: (expenseId: string) => void;
  onStopEdit: () => void;
  onUpdateExpense: (expenseId: string, updates: Partial<Expense>) => void;
  onDeleteExpense: (expenseId: string) => void;
}

function GroupedPersonalExpenses({
  expenses,
  users,
  personalCategories,
  editingExpense,
  onStartEdit,
  onStopEdit,
  onUpdateExpense,
  onDeleteExpense,
}: GroupedPersonalExpensesProps) {
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

  // Group expenses by personal category
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

  // Create category summaries
  const categorySummaries = Object.entries(groupedExpenses)
    .map(([categoryId, categoryExpenses]) => {
      const category = personalCategories.find((cat) => cat.id === categoryId);
      const categoryName = category?.name || 'Uncategorized';
      const totalAmount = categoryExpenses.reduce(
        (sum, exp) => sum + getMonthlyAmount(exp),
        0
      );

      return {
        id: categoryId,
        name: categoryName,
        expenses: categoryExpenses,
        totalAmount,
        count: categoryExpenses.length,
        isCollapsed: collapsedCategories.has(categoryId),
      };
    })
    .sort((a, b) => {
      // Sort categories: Uncategorized last, others alphabetically
      if (a.id === 'uncategorized' && b.id !== 'uncategorized') return 1;
      if (b.id === 'uncategorized' && a.id !== 'uncategorized') return -1;
      return a.name.localeCompare(b.name);
    });

  return (
    <div className="space-y-4">
      {/* Grouped Categories */}
      <div className="space-y-3">
        {categorySummaries.map((categoryInfo) => (
          <div
            key={categoryInfo.id}
            className="border border-gray-200 rounded-lg"
          >
            {/* Category Header - Mobile: 3-row layout */}
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

                  <div className="font-medium text-gray-900 ml-6 sm:ml-0 sm:text-right sm:flex-shrink-0">
                    {formatMoney(categoryInfo.totalAmount)} kr/month
                  </div>
                </div>
              </button>
            </div>

            {/* Category Expenses */}
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
                        isSharedCategory={false}
                        category={null}
                        initialData={expense}
                        onSubmit={(updates) => {
                          onUpdateExpense(expense.id, updates);
                          onStopEdit();
                        }}
                        onCancel={onStopEdit}
                      />
                    ) : (
                      <ExpenseItem
                        expense={expense}
                        users={users}
                        personalCategories={personalCategories}
                        isEditing={false}
                        isSharedCategory={false}
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
