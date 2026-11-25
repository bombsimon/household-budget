import React, { useId, useState } from 'react';
import { DeleteButton } from './DeleteButton';
import type { Expense, PersonalExpenseCategory } from '../types';
import { CategoryAutocomplete } from './CategoryAutocomplete';

interface InlineExpenseFormProps {
  expense?: Expense;
  personalCategories: PersonalExpenseCategory[];
  onSave: (data: Omit<Expense, 'id'>) => void;
  onCancel: () => void;
  onDelete?: () => void;
  onCreateCategory: (name: string) => Promise<string>;
}

export function InlineExpenseForm({
  expense,
  personalCategories,
  onSave,
  onCancel,
  onDelete,
  onCreateCategory,
}: InlineExpenseFormProps) {
  const fieldId = useId();
  const [name, setName] = useState(expense?.name || '');
  const [amount, setAmount] = useState(expense?.amount?.toString() || '');
  const [isYearly, setIsYearly] = useState(expense?.isYearly || false);
  const [isBudgeted, setIsBudgeted] = useState(expense?.isBudgeted || false);
  const [personalCategoryId, setPersonalCategoryId] = useState(
    expense?.personalCategoryId || ''
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !amount.trim()) return;

    onSave({
      name: name.trim(),
      amount: parseFloat(amount),
      isShared: expense?.isShared ?? false,
      splitType: expense?.splitType ?? 'equal',
      paidBy: expense?.paidBy,
      userId: expense?.userId,
      isYearly,
      isBudgeted,
      personalCategoryId: personalCategoryId || undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="form-panel">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
        <div>
          <label htmlFor={`${fieldId}-1`} className="field-label">
            Name
          </label>
          <input
            id={`${fieldId}-1`}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Expense name"
            required
            autoFocus
            className="field"
          />
        </div>
        <div>
          <label htmlFor={`${fieldId}-2`} className="field-label">
            Amount (kr)
          </label>
          <input
            id={`${fieldId}-2`}
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Amount (kr)"
            required
            min="0"
            step="0.01"
            className="field"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
        <div>
          <label htmlFor={`${fieldId}-3`} className="field-label">
            Category
          </label>
          <CategoryAutocomplete
            id={`${fieldId}-3`}
            personalCategories={personalCategories}
            value={personalCategoryId}
            onChange={setPersonalCategoryId}
            onCreateCategory={onCreateCategory}
          />
        </div>
        <div className="flex items-end gap-4">
          <label className="flex items-center text-sm">
            <input
              type="checkbox"
              checked={isYearly}
              onChange={(e) => setIsYearly(e.target.checked)}
              className="mr-1.5"
            />
            Yearly
          </label>
          <label className="flex items-center text-sm">
            <input
              type="checkbox"
              checked={isBudgeted}
              onChange={(e) => setIsBudgeted(e.target.checked)}
              className="mr-1.5"
            />
            Budgeted
          </label>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button type="submit" className="btn-primary">
          {expense ? 'Save expense' : 'Add expense'}
        </button>
        <button type="button" onClick={onCancel} className="btn-secondary">
          Cancel
        </button>
        {onDelete && (
          <div className="ml-auto">
            <DeleteButton
              name={expense?.name ?? 'expense'}
              showLabel
              onDelete={onDelete}
            />
          </div>
        )}
      </div>
    </form>
  );
}
