import React, { useState } from 'react';
import {
  Plus,
  Edit2,
  Trash2,
  Calculator,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import type { Loan, User } from '../types';
import { formatMoney } from '../utils/expenseCalculations';
import { FormActionButtons } from './FormActionButtons';
import { SplitMethodSelector } from './SplitMethodSelector';
import { SplitInfoBox } from './SplitInfoBox';

interface LoanTrackerProps {
  users: User[];
  loans: Loan[];
  onAddLoan: (loan: Omit<Loan, 'id'>) => void;
  onUpdateLoan: (loanId: string, updates: Partial<Loan>) => void;
  onDeleteLoan: (loanId: string) => void;
}

export function LoanTracker({
  users,
  loans,
  onAddLoan,
  onUpdateLoan,
  onDeleteLoan,
}: LoanTrackerProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const totalOriginalAmount = loans.reduce(
    (sum, loan) => sum + loan.originalAmount,
    0
  );
  const totalCurrentAmount = loans.reduce(
    (sum, loan) => sum + loan.currentAmount,
    0
  );
  const totalMonthlyPayment = loans.reduce(
    (sum, loan) => sum + loan.monthlyPayment,
    0
  );
  const totalPaidOff = totalOriginalAmount - totalCurrentAmount;
  const totalMonthlyInterest = loans.reduce((sum, loan) => {
    return sum + (loan.currentAmount * loan.interestRate) / 12;
  }, 0);
  // const averageInterestRate =
  //   loans.length > 0
  //     ? loans.reduce((sum, loan) => sum + loan.interestRate, 0) / loans.length
  //     : 0;

  return (
    <div className="bg-white rounded-lg shadow-sm p-3 sm:p-6">
      <div className="mb-4 sm:mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900 flex items-center gap-2">
            <Calculator className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="hidden xs:inline">Loans & Mortgages</span>
            <span className="xs:hidden">Loans</span>
          </h2>

          {/* Desktop: inline button */}
          <button
            onClick={() => setIsAdding(true)}
            className="hidden sm:flex items-center justify-center gap-2 px-4 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors min-w-[100px]"
          >
            <Plus className="w-4 h-4" />
            <span>Add Loan</span>
          </button>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mt-2">
          <p className="text-sm text-gray-600">
            Track loans, mortgages, and other debt obligations with payment
            schedules.
          </p>

          {/* Mobile: separate row button */}
          <button
            onClick={() => setIsAdding(true)}
            className="sm:hidden flex items-center justify-center gap-2 px-4 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add Loan</span>
          </button>
        </div>
      </div>

      {loans.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <SummaryCard
            title="Total Debt"
            amount={totalCurrentAmount}
            color="text-red-600"
            trend="down"
          />
          <SummaryCard
            title="Paid Off"
            amount={totalPaidOff}
            color="text-green-600"
            trend="up"
            subtitle={`${((totalPaidOff / totalOriginalAmount) * 100).toFixed(1)}% paid`}
          />
          <SummaryCard
            title="Monthly Payment"
            amount={totalMonthlyPayment}
            color="text-blue-600"
          />
          <SummaryCard
            title="Monthly Interest"
            amount={totalMonthlyInterest}
            color="text-orange-600"
          />
        </div>
      )}

      {isAdding && (
        <LoanForm
          users={users}
          onSubmit={(loan) => {
            onAddLoan(loan);
            setIsAdding(false);
          }}
          onCancel={() => setIsAdding(false)}
        />
      )}

      <div className="space-y-4">
        {loans.map((loan) => (
          <LoanCard
            key={loan.id}
            users={users}
            loan={loan}
            isEditing={editingId === loan.id}
            onUpdate={(updates) => {
              onUpdateLoan(loan.id, updates);
              setEditingId(null);
            }}
            onDelete={() => onDeleteLoan(loan.id)}
            onStartEdit={() => setEditingId(loan.id)}
            onStopEdit={() => setEditingId(null)}
          />
        ))}
      </div>

      {loans.length === 0 && !isAdding && (
        <div className="text-center py-12 text-gray-500">
          <Calculator className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No loans added yet. Click "Add Loan" to get started.</p>
        </div>
      )}
    </div>
  );
}

interface SummaryCardProps {
  title: string;
  amount: number;
  color: string;
  trend?: 'up' | 'down';
  subtitle?: string;
  isPercentage?: boolean;
}

function SummaryCard({
  title,
  amount,
  color,
  trend,
  subtitle,
  isPercentage = false,
}: SummaryCardProps) {
  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-gray-500">{title}</h3>
        {trend &&
          (trend === 'up' ? (
            <TrendingUp className={`w-4 h-4 ${color}`} />
          ) : (
            <TrendingDown className={`w-4 h-4 ${color}`} />
          ))}
      </div>
      <div className={`text-2xl font-bold ${color}`}>
        {isPercentage
          ? `${(amount * 100).toFixed(2)}%`
          : `${formatMoney(amount)} kr`}
      </div>
      {subtitle && <div className="text-sm text-gray-500 mt-1">{subtitle}</div>}
    </div>
  );
}

interface LoanCardProps {
  users: User[];
  loan: Loan;
  isEditing: boolean;
  onUpdate: (updates: Partial<Loan>) => void;
  onDelete: () => void;
  onStartEdit: () => void;
  onStopEdit: () => void;
}

function LoanCard({
  users,
  loan,
  isEditing,
  onUpdate,
  onDelete,
  onStartEdit,
  onStopEdit,
}: LoanCardProps) {
  const paidOffAmount = loan.originalAmount - loan.currentAmount;
  const paidOffPercentage = (paidOffAmount / loan.originalAmount) * 100;
  const monthlyInterest = (loan.currentAmount * loan.interestRate) / 12;
  const monthlyPrincipal = loan.monthlyPayment - monthlyInterest;
  const monthsToPayOff = loan.currentAmount / monthlyPrincipal;

  const testMonthlyInterest = loan.testInterestRate
    ? (loan.currentAmount * loan.testInterestRate) / 12
    : null;
  const testMonthlyPayment = loan.testInterestRate
    ? testMonthlyInterest! + monthlyPrincipal
    : null;
  const testDifference = testMonthlyPayment
    ? testMonthlyPayment - loan.monthlyPayment
    : 0;

  if (isEditing) {
    return (
      <LoanForm
        users={users}
        initialData={loan}
        onSubmit={onUpdate}
        onCancel={onStopEdit}
      />
    );
  }

  return (
    <div className="border border-gray-200 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex flex-col">
          <h3 className="text-lg font-semibold text-gray-900">{loan.name}</h3>
          {loan.paidBy &&
            (() => {
              const payer = users.find((u) => u.id === loan.paidBy);
              return (
                <div className="text-sm text-gray-600 mt-1">
                  Paid by:{' '}
                  <span className="font-medium" style={{ color: payer?.color }}>
                    {payer?.name || 'Unknown'}
                  </span>
                </div>
              );
            })()}
        </div>
        <div className="flex gap-2">
          <button
            onClick={onStartEdit}
            className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={onDelete}
            className="p-2 text-gray-400 hover:text-red-600 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <div>
          <h4 className="text-sm font-medium text-gray-500 mb-3">
            Loan Overview
          </h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Original Amount:</span>
              <span>{formatMoney(loan.originalAmount)} kr</span>
            </div>
            <div className="flex justify-between">
              <span>Current Balance:</span>
              <span className="text-red-600">
                {formatMoney(loan.currentAmount)} kr
              </span>
            </div>
            <div className="flex justify-between">
              <span>Paid Off:</span>
              <span className="text-green-600 font-medium">
                {formatMoney(paidOffAmount)} kr ({paidOffPercentage.toFixed(1)}
                %)
              </span>
            </div>
            <div className="flex justify-between">
              <span>Interest Rate:</span>
              <span>{(loan.interestRate * 100).toFixed(2)}%</span>
            </div>
          </div>
        </div>

        <div>
          <h4 className="text-sm font-medium text-gray-500 mb-3">
            Monthly Payment
          </h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Total Payment:</span>
              <span className="font-medium">
                {formatMoney(loan.monthlyPayment)} kr
              </span>
            </div>
            <div className="flex justify-between">
              <span>Interest:</span>
              <span className="text-red-600">
                {monthlyInterest.toFixed(0)} kr
              </span>
            </div>
            <div className="flex justify-between">
              <span>Principal:</span>
              <span className="text-green-600">
                {monthlyPrincipal.toFixed(0)} kr
              </span>
            </div>
            <div className="flex justify-between text-xs text-gray-500">
              <span>Months to pay off:</span>
              <span>{Math.ceil(monthsToPayOff)} months</span>
            </div>
          </div>
        </div>

        {loan.testInterestRate && (
          <div>
            <h4 className="text-sm font-medium text-gray-500 mb-3">
              Test Rate ({(loan.testInterestRate * 100).toFixed(2)}%)
            </h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Test Payment:</span>
                <span className="font-medium">
                  {testMonthlyPayment!.toFixed(0)} kr
                </span>
              </div>
              <div className="flex justify-between">
                <span>Interest:</span>
                <span className="text-red-600">
                  {testMonthlyInterest!.toFixed(0)} kr
                </span>
              </div>
              <div className="flex justify-between">
                <span>Difference:</span>
                <span
                  className={
                    testDifference > 0 ? 'text-red-600' : 'text-green-600'
                  }
                >
                  {testDifference > 0 ? '+' : ''}
                  {testDifference.toFixed(0)} kr
                </span>
              </div>
              <div className="text-xs text-gray-500">
                {testDifference > 0 ? 'More expensive' : 'Cheaper'} by{' '}
                {Math.abs(testDifference * 12).toFixed(0)} kr/year
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 bg-gray-50 rounded-md p-3">
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className="bg-green-500 h-3 rounded-full transition-all duration-300"
            style={{ width: `${paidOffPercentage}%` }}
          />
        </div>
        <div className="text-xs text-gray-500 mt-1 text-center">
          {paidOffPercentage.toFixed(1)}% paid off
        </div>
      </div>
    </div>
  );
}

interface LoanFormProps {
  users: User[];
  initialData?: Loan;
  onSubmit: (loan: Omit<Loan, 'id'>) => void;
  onCancel: () => void;
}

function LoanForm({ users, initialData, onSubmit, onCancel }: LoanFormProps) {
  const [name, setName] = useState(initialData?.name || '');
  const [originalAmount, setOriginalAmount] = useState(
    initialData?.originalAmount?.toString() || ''
  );
  const [currentAmount, setCurrentAmount] = useState(
    initialData?.currentAmount?.toString() || ''
  );
  const [interestRate, setInterestRate] = useState(
    initialData ? (initialData.interestRate * 100).toString() : ''
  );
  const [monthlyPayment, setMonthlyPayment] = useState(
    initialData?.monthlyPayment?.toString() || ''
  );
  const [testInterestRate, setTestInterestRate] = useState(
    initialData?.testInterestRate
      ? (initialData.testInterestRate * 100).toString()
      : ''
  );

  // Splitting state
  const [paidBy, setPaidBy] = useState(
    initialData?.paidBy || users[0]?.id || ''
  );

  // Interest splitting
  const [isInterestShared, setIsInterestShared] = useState(
    initialData?.isInterestShared ?? true
  );
  const [interestSplitType, setInterestSplitType] = useState<
    'percentage' | 'equal'
  >(initialData?.interestSplitType || 'percentage');

  // Mortgage splitting
  const [isMortgageShared, setIsMortgageShared] = useState(
    initialData?.isMortgageShared ?? true
  );
  const [mortgageSplitType, setMortgageSplitType] = useState<
    'percentage' | 'equal'
  >(initialData?.mortgageSplitType || 'equal');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !name.trim() ||
      !originalAmount ||
      !currentAmount ||
      !interestRate ||
      !monthlyPayment
    ) {
      return;
    }

    // Calculate income-based split data for percentage type
    const totalIncome = users.reduce(
      (sum, user) => sum + user.monthlyIncome,
      0
    );

    // Interest split data
    const interestSplitData: { [userId: string]: number } = {};
    if (isInterestShared) {
      if (interestSplitType === 'percentage') {
        users.forEach((user) => {
          interestSplitData[user.id] =
            totalIncome > 0
              ? user.monthlyIncome / totalIncome
              : 1 / users.length;
        });
      } else {
        users.forEach((user) => {
          interestSplitData[user.id] = 1 / users.length;
        });
      }
    }

    // Mortgage split data
    const mortgageSplitData: { [userId: string]: number } = {};
    if (isMortgageShared) {
      if (mortgageSplitType === 'percentage') {
        users.forEach((user) => {
          mortgageSplitData[user.id] =
            totalIncome > 0
              ? user.monthlyIncome / totalIncome
              : 1 / users.length;
        });
      } else {
        users.forEach((user) => {
          mortgageSplitData[user.id] = 1 / users.length;
        });
      }
    }

    onSubmit({
      name: name.trim(),
      originalAmount: parseFloat(originalAmount),
      currentAmount: parseFloat(currentAmount),
      interestRate: parseFloat(interestRate) / 100,
      monthlyPayment: parseFloat(monthlyPayment),
      testInterestRate: testInterestRate
        ? parseFloat(testInterestRate) / 100
        : undefined,
      paidBy,

      // Interest splitting
      isInterestShared,
      interestSplitType,
      interestSplitData: isInterestShared ? interestSplitData : undefined,

      // Mortgage splitting
      isMortgageShared,
      mortgageSplitType,
      mortgageSplitData: isMortgageShared ? mortgageSplitData : undefined,
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="border border-gray-300 rounded-lg p-6 bg-gray-50 mb-4"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Loan Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g., Mortgage Part 1"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Original Amount (kr)
          </label>
          <input
            type="number"
            value={originalAmount}
            onChange={(e) => setOriginalAmount(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="1500000"
            required
            min="0"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Current Balance (kr)
          </label>
          <input
            type="number"
            value={currentAmount}
            onChange={(e) => setCurrentAmount(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="1300000"
            required
            min="0"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Interest Rate (%)
          </label>
          <input
            type="number"
            value={interestRate}
            onChange={(e) => setInterestRate(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="3.5"
            required
            min="0"
            step="0.01"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Monthly Payment (kr)
          </label>
          <input
            type="number"
            value={monthlyPayment}
            onChange={(e) => setMonthlyPayment(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="8500"
            required
            min="0"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Test Interest Rate (%) - Optional
          </label>
          <input
            type="number"
            value={testInterestRate}
            onChange={(e) => setTestInterestRate(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="2.8"
            min="0"
            step="0.01"
          />
        </div>
      </div>

      {/* Payment & Splitting Controls */}
      {users.length > 1 && (
        <div className="border-t border-gray-200 pt-4 mt-4">
          <h4 className="font-medium text-gray-900 mb-3">
            Payment & Splitting
          </h4>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Paid By
            </label>
            <select
              value={paidBy}
              onChange={(e) => setPaidBy(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
            </select>
          </div>

          {/* Interest and Mortgage Splitting - Side by Side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Interest Splitting */}
            <div className="border border-gray-200 rounded-md p-4">
              <h5 className="font-medium text-gray-800 mb-3">
                Interest Splitting
              </h5>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Interest Sharing
                  </label>
                  <select
                    value={isInterestShared ? 'shared' : 'personal'}
                    onChange={(e) =>
                      setIsInterestShared(e.target.value === 'shared')
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="shared">Household Cost</option>
                    <option value="personal">Personal Cost</option>
                  </select>
                </div>

                {isInterestShared && (
                  <SplitMethodSelector
                    value={interestSplitType as any}
                    onChange={(value) =>
                      setInterestSplitType(value as 'percentage' | 'equal')
                    }
                    name="interestSplitMethod"
                  />
                )}
              </div>

              {isInterestShared &&
                interestSplitType === 'percentage' &&
                (() => {
                  const totalIncome = users.reduce(
                    (sum, u) => sum + u.monthlyIncome,
                    0
                  );
                  const incomeBasedSplit = users.reduce(
                    (acc, user) => {
                      acc[user.id] =
                        totalIncome > 0
                          ? user.monthlyIncome / totalIncome
                          : 1 / users.length;
                      return acc;
                    },
                    {} as { [userId: string]: number }
                  );

                  return (
                    <div className="mt-3">
                      <SplitInfoBox
                        users={users}
                        splitData={incomeBasedSplit}
                      />
                    </div>
                  );
                })()}
            </div>

            {/* Mortgage/Principal Splitting */}
            <div className="border border-gray-200 rounded-md p-4">
              <h5 className="font-medium text-gray-800 mb-3">
                Mortgage Principal Splitting
              </h5>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Mortgage Sharing
                  </label>
                  <select
                    value={isMortgageShared ? 'shared' : 'personal'}
                    onChange={(e) =>
                      setIsMortgageShared(e.target.value === 'shared')
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="shared">Household Cost</option>
                    <option value="personal">Personal Cost</option>
                  </select>
                </div>

                {isMortgageShared && (
                  <SplitMethodSelector
                    value={mortgageSplitType as any}
                    onChange={(value) =>
                      setMortgageSplitType(value as 'percentage' | 'equal')
                    }
                    name="mortgageSplitMethod"
                  />
                )}
              </div>

              {isMortgageShared &&
                mortgageSplitType === 'percentage' &&
                (() => {
                  const totalIncome = users.reduce(
                    (sum, u) => sum + u.monthlyIncome,
                    0
                  );
                  const incomeBasedSplit = users.reduce(
                    (acc, user) => {
                      acc[user.id] =
                        totalIncome > 0
                          ? user.monthlyIncome / totalIncome
                          : 1 / users.length;
                      return acc;
                    },
                    {} as { [userId: string]: number }
                  );

                  return (
                    <div className="mt-3">
                      <SplitInfoBox
                        users={users}
                        splitData={incomeBasedSplit}
                      />
                    </div>
                  );
                })()}
            </div>
          </div>
        </div>
      )}

      <FormActionButtons
        submitType="submit"
        submitLabel={`${initialData ? 'Update' : 'Add'} Loan`}
        onCancel={onCancel}
      />
    </form>
  );
}
