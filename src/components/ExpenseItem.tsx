import React from 'react';
import { Edit2 } from 'lucide-react';
import type { Expense, User } from '../types';
import { getMonthlyAmount, formatMoney } from '../utils/expenseCalculations';
import { DeleteButton } from './DeleteButton';

interface ExpenseItemProps {
  expense: Expense;
  users: User[];
  isEditing: boolean;
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
  isEditing,
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

  const splitLabel =
    expense.splitType === 'equal' ? 'split equally' : 'split by income';

  const details = [
    users.length > 1 && expense.isShared
      ? `Paid by ${paidByUser?.name.split(' ')[0] || 'unknown'}`
      : null,
    users.length > 1 && expense.isShared ? splitLabel : null,
  ].filter(Boolean);

  return (
    <div className="flex flex-wrap items-center gap-x-2 py-2 sm:flex-nowrap sm:gap-x-4">
      <div className="min-w-0 flex-1">
        <p className="break-words font-medium">
          {expense.name}
          {expense.isBudgeted && (
            <span className="tag sm:ml-2 bg-warning-tag text-warning-ink">
              budgeted
            </span>
          )}
          {expense.isYearly && (
            <span className="tag sm:ml-2 bg-accent-tag text-accent-ink-strong">
              paid yearly
            </span>
          )}
        </p>
        {details.length > 0 && (
          <p className="hidden text-sm text-muted sm:block">
            {details.join(', ')}
          </p>
        )}
      </div>
      <div className="text-right">
        <p className="money font-semibold">
          {formatMoney(getMonthlyAmount(expense))} kr/month
        </p>
        {expense.isYearly && (
          <p className="money text-sm text-muted">
            {formatMoney(expense.amount)} kr/year
          </p>
        )}
      </div>
      <div className="flex flex-shrink-0">
        <button
          type="button"
          onClick={onStartEdit}
          className="icon-btn"
          aria-label={`Edit ${expense.name}`}
          title={`Edit ${expense.name}`}
        >
          <Edit2 className="h-4 w-4" aria-hidden="true" />
        </button>
        <DeleteButton name={expense.name} onDelete={onDelete} />
      </div>
      {details.length > 0 && (
        <p className="w-full text-sm text-muted sm:hidden">
          {details.join(', ')}
        </p>
      )}
    </div>
  );
}
