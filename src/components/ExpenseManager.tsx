import React, { useState } from 'react';
import {
  Plus,
  Edit2,
  Trash2,
  ChevronDown,
  ChevronRight,
  Receipt,
  ArrowUp,
  ArrowDown,
  Scale,
  Percent,
  User as UserIcon,
} from 'lucide-react';
import type {
  User,
  Expense,
  ExpenseCategory,
  PersonalExpenseCategory,
} from '../types';
import { PersonalCategoryManager } from './PersonalCategoryManager';
import {
  getMonthlyAmount,
  formatExpenseAmount,
  getFrequencyText,
  formatMoney,
} from '../utils/expenseCalculations';
import { FormActionButtons } from './FormActionButtons';
import { SplitMethodSelector } from './SplitMethodSelector';
import { SplitInfoBox } from './SplitInfoBox';

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
  const [sharedSortBy, setSharedSortBy] = useState<'name' | 'amount'>('name');
  const [sharedSortOrder, setSharedSortOrder] = useState<'asc' | 'desc'>('asc');

  const toggleSharedSort = (newSortBy: 'name' | 'amount') => {
    if (sharedSortBy === newSortBy) {
      setSharedSortOrder(sharedSortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSharedSortBy(newSortBy);
      setSharedSortOrder('asc');
    }
  };

  const sortSharedExpenses = (expenses: Expense[]) => {
    return [...expenses].sort((a, b) => {
      let aValue, bValue;

      if (sharedSortBy === 'name') {
        aValue = a.name.toLowerCase();
        bValue = b.name.toLowerCase();
        return sharedSortOrder === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      } else {
        aValue = getMonthlyAmount(a);
        bValue = getMonthlyAmount(b);
        return sharedSortOrder === 'asc' ? aValue - bValue : bValue - aValue;
      }
    });
  };

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
        {categories.map((category) => {
          const isSharedCategory = category.id === 'shared';
          const isPersonalCategory = category.id.startsWith('personal-');
          const totalExpenses = category.expenses.reduce(
            (sum, expense) => sum + getMonthlyAmount(expense),
            0
          );

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
                        <div className="text-sm font-medium text-gray-700 mt-1 sm:mt-0">
                          {formatMoney(totalExpenses)} kr/month
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
                
                {/* Mobile: Add button on separate row */}
                <div className="sm:hidden mt-2">
                  <button
                    onClick={() => setAddingToCategory(category.id)}
                    className="w-full flex items-center justify-center gap-1 px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm"
                  >
                    <Plus className="w-4 h-4" />
                    Add Expense
                  </button>
                </div>
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
                    <>
                      {isSharedCategory && category.expenses.length > 0 && (
                        <div className="flex justify-end gap-2 mb-4">
                          <span className="text-xs text-gray-500 self-center">
                            Sort by:
                          </span>
                          <button
                            onClick={() => toggleSharedSort('name')}
                            className={`flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors ${
                              sharedSortBy === 'name'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                          >
                            Name
                            {sharedSortBy === 'name' &&
                              (sharedSortOrder === 'asc' ? (
                                <ArrowUp className="w-3 h-3" />
                              ) : (
                                <ArrowDown className="w-3 h-3" />
                              ))}
                          </button>
                          <button
                            onClick={() => toggleSharedSort('amount')}
                            className={`flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors ${
                              sharedSortBy === 'amount'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                          >
                            Amount
                            {sharedSortBy === 'amount' &&
                              (sharedSortOrder === 'asc' ? (
                                <ArrowUp className="w-3 h-3" />
                              ) : (
                                <ArrowDown className="w-3 h-3" />
                              ))}
                          </button>
                        </div>
                      )}
                      <div className="space-y-2">
                        {(isSharedCategory
                          ? sortSharedExpenses(category.expenses)
                          : category.expenses
                        ).map((expense) => (
                          <div key={expense.id}>
                            {editingExpense === expense.id ? (
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
                                onStartEdit={() =>
                                  setEditingExpense(expense.id)
                                }
                                onStopEdit={() => setEditingExpense(null)}
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    </>
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

interface ExpenseItemProps {
  expense: Expense;
  users: User[];
  personalCategories: PersonalExpenseCategory[];
  isEditing: boolean;
  isSharedCategory: boolean;
  onUpdate: (updates: Partial<Expense>) => void;
  onDelete: () => void;
  onStartEdit: () => void;
  onStopEdit: () => void;
}

function ExpenseItem({
  expense,
  users,
  personalCategories,
  isEditing,
  isSharedCategory,
  onUpdate,
  onDelete,
  onStartEdit,
  onStopEdit,
}: ExpenseItemProps) {
  const paidByUser = users.find((u) => u.id === expense.paidBy);

  if (isEditing) {
    return (
      <ExpenseForm
        users={users}
        personalCategories={personalCategories}
        isSharedCategory={isSharedCategory}
        category={null}
        initialData={expense}
        onSubmit={(updates) => {
          onUpdate(updates);
          onStopEdit();
        }}
        onCancel={onStopEdit}
      />
    );
  }

  const getSplitIcon = () => {
    if (expense.splitType === 'equal') {
      return <Scale className="w-3 h-3 text-gray-500" />;
    } else if (expense.splitType === 'percentage') {
      return <Percent className="w-3 h-3 text-gray-500" />;
    }
    return <UserIcon className="w-3 h-3 text-gray-500" />;
  };

  const getShortSplitDescription = () => {
    if (expense.splitType === 'equal') {
      return '50/50';
    } else if (expense.splitType === 'percentage' && expense.splitData) {
      return 'Income %';
    }
    return 'Fixed';
  };

  // Multi-line layout for personal expenses with compact yearly display
  if (!isSharedCategory && !expense.isShared) {
    const monthlyAmount = getMonthlyAmount(expense);
    const isYearly = expense.isYearly;
    
    return (
      <div className="p-3 border border-gray-200 rounded bg-white">
        <div className="space-y-2">
          {/* Row 1: Title, Amount, and Icons (desktop) */}
          <div className="flex items-start justify-between">
            <h4 className="font-medium text-gray-900 flex-1 mr-2 text-left">{expense.name}</h4>
            <div className="flex items-center gap-2">
              <div className="text-sm text-gray-500 text-right">
                {isYearly ? (
                  <span className="text-xs">
                    {expense.amount.toLocaleString()} kr/year ({monthlyAmount.toLocaleString()} kr/month)
                  </span>
                ) : (
                  <span>{formatExpenseAmount(expense, true)}</span>
                )}
              </div>
              {/* Desktop: Icons on same line */}
              <div className="hidden sm:flex gap-1">
                <button
                  onClick={onStartEdit}
                  className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                  title="Edit expense"
                >
                  <Edit2 className="w-3 h-3" />
                </button>
                <button
                  onClick={onDelete}
                  className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                  title="Delete expense"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
          
          {/* Row 2: Yearly indicator (if yearly) */}
          {isYearly && (
            <div className="flex justify-end sm:justify-start sm:ml-0">
              <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded-full">
                yearly
              </span>
            </div>
          )}
          
          {/* Mobile: Icons on separate line */}
          <div className="flex justify-center gap-4 sm:hidden">
            <button
              onClick={onStartEdit}
              className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
              title="Edit expense"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              onClick={onDelete}
              className="p-2 text-gray-400 hover:text-red-600 transition-colors"
              title="Delete expense"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Multi-line layout for shared expenses
  return (
    <div className="p-3 border border-gray-200 rounded bg-white">
      <div className="space-y-2">
        {/* Row 1: Title, Amount, and Icons (desktop) */}
        <div className="flex items-start justify-between">
          <h4 className="font-medium text-gray-900 flex-1 mr-2 text-left">{expense.name}</h4>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500 text-right">
              {formatExpenseAmount(expense, true)}
            </span>
            {/* Desktop: Icons on same line */}
            <div className="hidden sm:flex gap-1">
              <button
                onClick={onStartEdit}
                className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                title="Edit expense"
              >
                <Edit2 className="w-3 h-3" />
              </button>
              <button
                onClick={onDelete}
                className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                title="Delete expense"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
        
        {/* Row 2: Payee and Payment method */}
        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-2">
            <span>by {paidByUser?.name || 'Unknown'}</span>
            {expense.isYearly && (
              <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full">
                {getFrequencyText(expense)}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {getSplitIcon()}
            <span>{getShortSplitDescription()}</span>
          </div>
        </div>
        
        {/* Mobile: Icons on separate line */}
        <div className="flex justify-center gap-4 sm:hidden">
          <button
            onClick={onStartEdit}
            className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
            title="Edit expense"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={onDelete}
            className="p-2 text-gray-400 hover:text-red-600 transition-colors"
            title="Delete expense"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

interface ExpenseFormProps {
  users: User[];
  personalCategories: PersonalExpenseCategory[];
  isSharedCategory: boolean;
  category: ExpenseCategory | null;
  initialData?: Expense;
  onSubmit: (expense: Omit<Expense, 'id'>) => void;
  onCancel: () => void;
}

function ExpenseForm({
  users,
  personalCategories,
  isSharedCategory,
  category,
  initialData,
  onSubmit,
  onCancel,
}: ExpenseFormProps) {
  const [name, setName] = useState(initialData?.name || '');
  const [amount, setAmount] = useState(initialData?.amount?.toString() || '');
  // Determine if this is a personal category and which user
  const isPersonalCategory = category?.id.startsWith('personal-') ?? false;
  const personalUserId =
    isPersonalCategory && category
      ? category.id.replace('personal-', '')
      : null;

  const [isShared, setIsShared] = useState(
    initialData?.isShared ?? isSharedCategory
  );
  const [splitType, setSplitType] = useState(
    initialData?.splitType || (isSharedCategory ? 'equal' : 'fixed')
  );
  const [paidBy, setPaidBy] = useState(
    initialData?.paidBy || personalUserId || users[0]?.id || ''
  );
  const [userId, setUserId] = useState(
    initialData?.userId || personalUserId || ''
  );
  const [isYearly, setIsYearly] = useState(initialData?.isYearly || false);
  // Calculate income-based percentages
  const totalIncome = users.reduce((sum, user) => sum + user.monthlyIncome, 0);
  const incomeBasedSplit = users.reduce(
    (acc, user) => {
      acc[user.id] =
        totalIncome > 0 ? user.monthlyIncome / totalIncome : 1 / users.length;
      return acc;
    },
    {} as { [userId: string]: number }
  );

  const [splitData, setSplitData] = useState<{ [userId: string]: number }>(
    initialData?.splitData || incomeBasedSplit
  );
  const [personalCategoryId, setPersonalCategoryId] = useState(
    initialData?.personalCategoryId || ''
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !amount.trim()) return;

    let finalSplitData: { [userId: string]: number } | undefined;

    if (isShared && splitType === 'percentage') {
      const totalPercentage = Object.values(splitData).reduce(
        (sum, val) => sum + val,
        0
      );
      if (Math.abs(totalPercentage - 1) > 0.001) {
        alert('Percentages must add up to 100%');
        return;
      }
      finalSplitData = splitData;
    }

    onSubmit({
      name: name.trim(),
      amount: parseFloat(amount),
      isShared: isSharedCategory,
      splitType,
      splitData: finalSplitData,
      paidBy,
      userId: isSharedCategory ? undefined : personalUserId || userId,
      isYearly,
      personalCategoryId: personalCategoryId || undefined,
    });
  };

  // Remove manual percentage change since we auto-calculate based on income

  return (
    <form
      onSubmit={handleSubmit}
      className="p-4 border border-gray-300 rounded-lg bg-gray-50"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Expense Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter expense name"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Amount (kr)
          </label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter amount"
            required
            min="0"
            step="0.01"
          />
        </div>
      </div>

      {!isPersonalCategory && !initialData?.userId && users.length > 1 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Paid By
            </label>
            <select
              value={paidBy}
              onChange={(e) => setPaidBy(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      <div className="flex items-center gap-4 mb-4">
        {!isSharedCategory &&
          !isPersonalCategory &&
          !initialData?.userId &&
          users.length > 1 && (
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={isShared}
                onChange={(e) => setIsShared(e.target.checked)}
                className="mr-2"
              />
              Household Expense
            </label>
          )}
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={isYearly}
            onChange={(e) => setIsYearly(e.target.checked)}
            className="mr-2"
          />
          Yearly Expense
        </label>
        {isSharedCategory && (
          <span className="text-sm text-blue-600 font-medium">
            Household expense between users
          </span>
        )}
        {isPersonalCategory && (
          <span className="text-sm text-green-600 font-medium">
            Personal expense for{' '}
            {users.find((u) => u.id === personalUserId)?.name}
          </span>
        )}
      </div>

      {isSharedCategory && users.length > 1 ? (
        <div className="mb-4">
          <SplitMethodSelector
            value={splitType as any}
            onChange={(value) => {
              setSplitType(value);
              if (value === 'percentage') {
                setSplitData(incomeBasedSplit);
              }
            }}
            showFixed={false}
          />

          {splitType === 'percentage' && (
            <SplitInfoBox users={users} splitData={splitData} />
          )}
        </div>
      ) : isSharedCategory && users.length === 1 ? (
        <div className="mb-4">
          <span className="text-sm text-blue-600 font-medium">
            Household expense for single user - no split needed
          </span>
        </div>
      ) : (
        <div className="space-y-4 mb-4">
          {!isPersonalCategory && !initialData?.userId && users.length > 1 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Assigned To
              </label>
              <select
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Select user...</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          {(userId || isPersonalCategory || users.length === 1) && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category (optional)
              </label>
              <select
                value={personalCategoryId}
                onChange={(e) => setPersonalCategoryId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Uncategorized</option>
                {personalCategories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}

      <FormActionButtons
        submitType="submit"
        submitLabel={`${initialData ? 'Update' : 'Add'} Expense`}
        onCancel={onCancel}
      />
    </form>
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
  const [sortBy, setSortBy] = useState<'name' | 'amount'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const toggleCategoryCollapse = (categoryId: string) => {
    const newCollapsed = new Set(collapsedCategories);
    if (newCollapsed.has(categoryId)) {
      newCollapsed.delete(categoryId);
    } else {
      newCollapsed.add(categoryId);
    }
    setCollapsedCategories(newCollapsed);
  };

  const toggleSort = (newSortBy: 'name' | 'amount') => {
    if (sortBy === newSortBy) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(newSortBy);
      setSortOrder('asc');
    }
  };

  const sortExpenses = (expenses: Expense[]) => {
    return [...expenses].sort((a, b) => {
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
        expenses: sortExpenses(categoryExpenses),
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
      {/* Sorting Controls */}
      <div className="flex justify-end gap-2">
        <span className="text-xs text-gray-500 self-center">Sort by:</span>
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
              <div className="p-3 space-y-2">
                {categoryInfo.expenses.map((expense) => (
                  <div key={expense.id}>
                    {editingExpense === expense.id ? (
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
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
