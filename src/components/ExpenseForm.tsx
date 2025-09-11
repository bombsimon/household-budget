import React, { useState } from 'react';
import type {
  Expense,
  User,
  PersonalExpenseCategory,
  ExpenseCategory,
} from '../types';
import { FormActionButtons } from './FormActionButtons';
import { SplitMethodSelector } from './SplitMethodSelector';
import { SplitInfoBox } from './SplitInfoBox';

interface ExpenseFormProps {
  users: User[];
  personalCategories: PersonalExpenseCategory[];
  isSharedCategory: boolean;
  category: ExpenseCategory | null;
  initialData?: Expense;
  onSubmit: (expense: Omit<Expense, 'id'>) => void;
  onCancel: () => void;
  showCategorySelector?: boolean;
  isAssetExpense?: boolean; // New prop to handle asset expenses differently
}

export function ExpenseForm({
  users,
  personalCategories,
  isSharedCategory,
  category,
  initialData,
  onSubmit,
  onCancel,
  showCategorySelector = true,
  isAssetExpense = false,
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
    initialData?.isShared ??
      (isAssetExpense ? users.length > 1 : isSharedCategory)
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
  const [isBudgeted, setIsBudgeted] = useState(
    initialData?.isBudgeted || false
  );

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
      isShared: isAssetExpense ? users.length > 1 : isSharedCategory,
      splitType,
      splitData: finalSplitData,
      paidBy,
      userId: isAssetExpense
        ? users.length === 1
          ? users[0].id
          : undefined
        : isSharedCategory
          ? undefined
          : personalUserId || userId,
      isYearly,
      isBudgeted,
      personalCategoryId: isAssetExpense
        ? undefined
        : personalCategoryId || undefined,
    });
  };

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
          !isAssetExpense &&
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
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={isBudgeted}
            onChange={(e) => setIsBudgeted(e.target.checked)}
            className="mr-2"
          />
          Budgeted Expense
        </label>
        {isPersonalCategory && (
          <span className="text-sm text-green-600 font-medium">
            Personal expense for{' '}
            {users.find((u) => u.id === personalUserId)?.name}
          </span>
        )}
      </div>

      {/* Category selection - available for all expense types */}
      {showCategorySelector && (
        <div className="mb-4">
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

      {isSharedCategory || (isAssetExpense && users.length > 1) ? (
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
      ) : (
        <div className="space-y-4 mb-4">
          {!isPersonalCategory &&
            !initialData?.userId &&
            !isAssetExpense &&
            users.length > 1 && (
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
