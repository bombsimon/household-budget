import type { Expense } from '../types';

/**
 * Get the monthly equivalent amount for an expense
 * If yearly, divide by 12. Otherwise return as-is.
 */
export const getMonthlyAmount = (expense: Expense): number => {
  if (expense.isYearly) {
    return expense.amount / 12;
  }
  return expense.amount;
};

/**
 * Format an expense amount with appropriate frequency indicator
 */
export const formatExpenseAmount = (
  expense: Expense,
  includeFrequency = false
): string => {
  const monthlyAmount = getMonthlyAmount(expense);
  const formattedAmount = monthlyAmount.toLocaleString();

  if (!includeFrequency) {
    return `${formattedAmount} kr`;
  }

  if (expense.isYearly) {
    return `${expense.amount.toLocaleString()} kr/year (${formattedAmount} kr/month)`;
  }

  return `${formattedAmount} kr/month`;
};

/**
 * Get display text for expense frequency
 */
export const getFrequencyText = (expense: Expense): string => {
  return expense.isYearly ? 'Yearly' : 'Monthly';
};

/**
 * Format money amounts consistently (rounded to whole numbers)
 */
export const formatMoney = (amount: number): string => {
  return Math.round(amount).toLocaleString();
};
