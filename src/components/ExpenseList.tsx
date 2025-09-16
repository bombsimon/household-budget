import React, { useState } from 'react';
import { ArrowUp, ArrowDown } from 'lucide-react';
import type { Expense } from '../types';
import { getMonthlyAmount } from '../utils/expenseCalculations';

interface ExpenseListProps {
  expenses: Expense[];
  renderExpenseItem: (expense: Expense, index: number) => React.ReactNode;
  showSorting?: boolean;
  variant?: 'list' | 'card';
}

export function ExpenseList({
  expenses,
  renderExpenseItem,
  showSorting = true,
  variant = 'list',
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
      {/* Sorting Controls */}
      {showSorting && expenses.length > 0 && (
        <div className="flex justify-end gap-2 mb-4">
          <span className="text-xs text-gray-500 self-center">Sort by:</span>
          <button
            onClick={() => toggleSort('name')}
            className={`flex items-center gap-1 px-2 py-0 text-xs rounded transition-colors h-6 sm:h-7 ${
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
            className={`flex items-center gap-1 px-2 py-0 text-xs rounded transition-colors h-6 sm:h-7 ${
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
          <button
            onClick={() => toggleSort('type')}
            className={`flex items-center gap-1 px-2 py-0 text-xs rounded transition-colors h-6 sm:h-7 ${
              sortBy === 'type'
                ? 'bg-blue-100 text-blue-800'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Type
            {sortBy === 'type' &&
              (sortOrder === 'asc' ? (
                <ArrowUp className="w-3 h-3" />
              ) : (
                <ArrowDown className="w-3 h-3" />
              ))}
          </button>
        </div>
      )}

      {/* Expense List */}
      <div className={variant === 'card' ? 'space-y-1' : ''}>
        {sortedExpenses.map((expense, index) => (
          <div
            key={expense.id}
            className={
              variant === 'card'
                ? 'rounded bg-white'
                : index % 2 === 0
                  ? 'bg-white'
                  : 'bg-gray-50'
            }
          >
            {renderExpenseItem(expense, index)}
          </div>
        ))}
      </div>
    </div>
  );
}
