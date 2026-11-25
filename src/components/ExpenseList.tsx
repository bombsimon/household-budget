import React, { useState } from 'react';
import { ArrowUp, ArrowDown } from 'lucide-react';
import type { Expense } from '../types';
import { getMonthlyAmount } from '../utils/expenseCalculations';

interface ExpenseListProps {
  expenses: Expense[];
  renderExpenseItem: (expense: Expense) => React.ReactNode;
  showSorting?: boolean;
}

export function ExpenseList({
  expenses,
  renderExpenseItem,
  showSorting = true,
}: ExpenseListProps) {
  const [sortBy, setSortBy] = useState<'name' | 'amount'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

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

  const sortedExpenses = sortExpenses(expenses);

  return (
    <div>
      {showSorting && expenses.length > 1 && (
        <div
          role="group"
          aria-label="Sort by"
          className="mb-1 flex justify-end gap-1 text-sm"
        >
          {(['name', 'amount'] as const).map((key) => {
            const isActive = sortBy === key;

            return (
              <button
                key={key}
                type="button"
                aria-pressed={isActive}
                onClick={() => toggleSort(key)}
                className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 capitalize hover:bg-hover ${
                  isActive
                    ? 'bg-accent-tag font-semibold text-accent-ink-strong'
                    : 'text-muted'
                }`}
              >
                {key}
                {isActive &&
                  (sortOrder === 'asc' ? (
                    <ArrowUp className="h-3 w-3" aria-label="ascending" />
                  ) : (
                    <ArrowDown className="h-3 w-3" aria-label="descending" />
                  ))}
              </button>
            );
          })}
        </div>
      )}

      <div className="divide-y divide-line">
        {sortedExpenses.map((expense) => (
          <div key={expense.id}>{renderExpenseItem(expense)}</div>
        ))}
      </div>
    </div>
  );
}
