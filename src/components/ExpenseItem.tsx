import React from 'react';
import { Edit2, Trash2, Scale, Percent, User as UserIcon } from 'lucide-react';
import type { Expense, User, PersonalExpenseCategory } from '../types';
import {
  getMonthlyAmount,
  formatExpenseAmount,
  getFrequencyText,
} from '../utils/expenseCalculations';

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
  renderEditForm?: (
    expense: Expense,
    onSubmit: (updates: Partial<Expense>) => void,
    onCancel: () => void
  ) => React.ReactNode;
}

export function ExpenseItem({
  expense,
  users,
  personalCategories: _personalCategories,
  isEditing,
  isSharedCategory,
  onUpdate,
  onDelete,
  onStartEdit,
  onStopEdit,
  renderEditForm,
}: ExpenseItemProps) {
  const paidByUser = users.find((u) => u.id === expense.paidBy);

  if (isEditing && renderEditForm) {
    return (
      <div>
        {renderEditForm(
          expense,
          (updates) => {
            onUpdate(updates);
            onStopEdit();
          },
          onStopEdit
        )}
      </div>
    );
  }

  const getSplitDisplay = () => {
    if (expense.splitType === 'equal') {
      return (
        <div className="flex items-center gap-1">
          <Scale className="w-3 h-3 text-gray-500" />
          <span>50/50</span>
        </div>
      );
    } else if (expense.splitType === 'percentage' && expense.splitData) {
      return (
        <div className="flex items-center gap-1">
          <Percent className="w-3 h-3 text-gray-500" />
          <span>Income</span>
        </div>
      );
    }
    return (
      <div className="flex items-center gap-1">
        <UserIcon className="w-3 h-3 text-gray-500" />
        <span>Fixed</span>
      </div>
    );
  };

  // Multi-line layout for personal expenses with compact yearly display
  if (!isSharedCategory && !expense.isShared) {
    const monthlyAmount = getMonthlyAmount(expense);
    const isYearly = expense.isYearly;

    return (
      <div
        className={`p-3 rounded border border-gray-300 ${
          expense.isBudgeted ? 'bg-orange-50' : 'bg-white'
        }`}
      >
        <div className="space-y-2">
          {/* Row 1: Title, Amount, and Icons (desktop) */}
          <div className="flex items-start justify-between">
            <h4 className="font-medium text-gray-900 flex-1 mr-2 text-left">
              {expense.name}
            </h4>
            <div className="flex items-center gap-2">
              <div className="text-sm text-gray-500 text-right">
                {isYearly ? (
                  <span className="text-xs">
                    {expense.amount.toLocaleString()} kr/year (
                    {monthlyAmount.toLocaleString()} kr/month)
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
              <span
                className="px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded-full cursor-pointer hover:bg-blue-200 transition-colors"
                onClick={() => onStartEdit()}
                title="Click to edit this expense"
              >
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
    <div
      className={`p-3 rounded border border-gray-300 ${
        expense.isBudgeted ? 'bg-orange-50' : 'bg-white'
      }`}
    >
      <div className="space-y-2">
        {/* Row 1: Title, Amount, and Icons (desktop) */}
        <div className="flex items-start justify-between">
          <h4 className="font-medium text-gray-900 flex-1 mr-2 text-left">
            {expense.name}
          </h4>
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

        {/* Row 2: Payee and Payment method - only show if multiple users */}
        {users.length > 1 && (
          <div className="flex items-center justify-between text-xs text-gray-500">
            <div className="flex items-center gap-2">
              <span>by {paidByUser?.name || 'Unknown'}</span>
              {expense.isYearly && (
                <span
                  className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full text-xs cursor-pointer hover:bg-blue-200 transition-colors"
                  onClick={() => onStartEdit()}
                  title="Click to edit this expense"
                >
                  {getFrequencyText(expense)}
                </span>
              )}
            </div>
            <div className="flex-shrink-0">{getSplitDisplay()}</div>
          </div>
        )}

        {/* Row 2 alternative for single user: Just show yearly indicator if needed */}
        {users.length === 1 && expense.isYearly && (
          <div className="flex justify-center text-xs text-gray-500">
            <span
              className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full text-xs cursor-pointer hover:bg-blue-200 transition-colors"
              onClick={() => onStartEdit()}
              title="Click to edit this expense"
            >
              {getFrequencyText(expense)}
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
