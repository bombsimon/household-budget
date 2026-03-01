import React, { useState } from 'react';
import { Save, X, Trash2 } from 'lucide-react';
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
      splitData: expense?.splitData,
      paidBy: expense?.paidBy,
      userId: expense?.userId,
      isYearly,
      isBudgeted,
      personalCategoryId: personalCategoryId || undefined,
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="p-3 bg-blue-50 border border-blue-200 rounded-lg"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Expense name"
          required
          autoFocus
          className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
        />
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Amount (kr)"
          required
          min="0"
          step="0.01"
          className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Category
          </label>
          <CategoryAutocomplete
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
        <button
          type="submit"
          className="flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          <Save className="w-3.5 h-3.5" />
          {expense ? 'Update' : 'Add'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex items-center gap-1 px-3 py-1.5 text-sm bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
        >
          <X className="w-3.5 h-3.5" />
          Cancel
        </button>
        {onDelete && (
          <button
            type="button"
            onClick={onDelete}
            className="flex items-center gap-1 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-md transition-colors ml-auto"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Delete
          </button>
        )}
      </div>
    </form>
  );
}
