import React, { useState } from 'react';
import { ArrowUp, ArrowDown } from 'lucide-react';
import type { Expense } from '../types';
import { getMonthlyAmount } from '../utils/expenseCalculations';

interface ExpenseListProps {
  expenses: Expense[];
  renderExpenseItem: (expense: Expense, index: number) => React.ReactNode;
  showSorting?: boolean;
}

export function ExpenseList({
  expenses,
  renderExpenseItem,
  showSorting = true,
}: ExpenseListProps) {
  const [sortBy, setSortBy] = useState<'name' | 'amount' | 'type'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [previousSort, setPreviousSort] = useState<'name' | 'amount'>('name');

  const toggleSort = (newSortBy: 'name' | 'amount' | 'type') => {
    if (sortBy === newSortBy) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      // Store previous sort when switching to type
      if (newSortBy === 'type' && (sortBy === 'name' || sortBy === 'amount')) {
        setPreviousSort(sortBy);
      }
      setSortBy(newSortBy);
      setSortOrder('asc');
    }
  };

  const sortExpenses = (expenses: Expense[]) => {
    return [...expenses].sort((a, b) => {
      if (sortBy === 'type') {
        // First sort by type (fixed first, then budgeted)
        const aType = a.isBudgeted ? 1 : 0;
        const bType = b.isBudgeted ? 1 : 0;
        const typeComparison =
          sortOrder === 'asc' ? aType - bType : bType - aType;

        if (typeComparison !== 0) {
          return typeComparison;
        }

        // If same type, use previous sort order within each type group
        if (previousSort === 'amount') {
          const aValue = getMonthlyAmount(a);
          const bValue = getMonthlyAmount(b);
          return aValue - bValue; // Always ascending for secondary sort
        } else {
          const aValue = a.name.toLowerCase();
          const bValue = b.name.toLowerCase();
          return aValue.localeCompare(bValue);
        }
      }

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
          {(['name', 'amount', 'type'] as const).map((key) => {
            const isActive = sortBy === key;

            return (
              <button
                key={key}
                type="button"
                aria-pressed={isActive}
                onClick={() => toggleSort(key)}
                className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 capitalize hover:bg-slate-100 ${
                  isActive
                    ? 'bg-blue-100 font-semibold text-blue-900'
                    : 'text-slate-600'
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

      <div className="divide-y divide-slate-200">
        {sortedExpenses.map((expense, index) => (
          <div key={expense.id}>{renderExpenseItem(expense, index)}</div>
        ))}
      </div>
    </div>
  );
}
