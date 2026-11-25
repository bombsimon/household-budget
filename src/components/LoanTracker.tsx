import React, { useId, useState } from 'react';
import { Plus, Edit2, CheckCircle2 } from 'lucide-react';
import type { Loan, User } from '../types';
import { formatMoney } from '../utils/expenseCalculations';
import { COST_COLORS } from '../utils/costColors';
import { Avatar } from './Avatar';
import { CostLegend, ProgressRing, SegmentedBar } from './CostCharts';
import { ConfirmDialog } from './ConfirmDialog';
import { DeleteButton } from './DeleteButton';
import { FormActionButtons } from './FormActionButtons';
import { SplitMethodSelector } from './SplitMethodSelector';
import { SplitInfoBox } from './SplitInfoBox';

interface LoanTrackerProps {
  users: User[];
  loans: Loan[];
  onAddLoan: (loan: Omit<Loan, 'id'>) => void;
  onUpdateLoan: (loanId: string, updates: Partial<Loan>) => void;
  onUpdateLoans: (updatesByLoanId: Record<string, Partial<Loan>>) => void;
  onDeleteLoan: (loanId: string) => void;
}

export function LoanTracker({
  users,
  loans,
  onAddLoan,
  onUpdateLoan,
  onUpdateLoans,
  onDeleteLoan,
}: LoanTrackerProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [repaymentGroup, setRepaymentGroup] = useState<string | null>(null);

  const {
    totalOriginalAmount,
    totalCurrentAmount,
    totalMonthlyPayment,
    totalPaidOff,
    totalMonthlyInterest,
    totalMonthlyCost,
  } = computeLoanTotals(loans);

  // Test interest calculations
  const loansWithTestRates = loans.filter((loan) => loan.testInterestRate);
  const totalTestMonthlyInterest = loansWithTestRates.reduce((sum, loan) => {
    return sum + (loan.currentAmount * loan.testInterestRate!) / 12;
  }, 0);
  const totalCurrentInterestForTestLoans = loansWithTestRates.reduce(
    (sum, loan) => {
      return sum + (loan.currentAmount * loan.interestRate) / 12;
    },
    0
  );
  const totalTestDifference =
    totalTestMonthlyInterest - totalCurrentInterestForTestLoans;
  const hasTestRates = loansWithTestRates.length > 0;

  const existingCategories = Array.from(
    new Set(
      loans
        .map((loan) => loan.category?.trim())
        .filter((category): category is string => !!category)
    )
  ).sort((a, b) => a.localeCompare(b));

  const groupedLoans = groupLoansByCategory(loans);
  const hasCategorizedLoans = existingCategories.length > 0;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="page-title">Loans</h1>
        <button
          type="button"
          onClick={() => setIsAdding(true)}
          className="btn-primary"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Add loan
        </button>
      </div>

      {loans.length > 0 && (
        <dl className="panel mb-5 grid divide-y divide-slate-200 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          <LoanFigure
            isHero
            label="Cost each month"
            amount={totalMonthlyCost}
            note={`${formatMoney(totalMonthlyPayment)} kr repayment + ${formatMoney(totalMonthlyInterest)} kr interest`}
          />
          <LoanFigure label="Left to pay" amount={totalCurrentAmount} />
          <LoanFigure
            label="Paid off"
            amount={totalPaidOff}
            note={
              totalOriginalAmount > 0
                ? `${((totalPaidOff / totalOriginalAmount) * 100).toFixed(1)}%`
                : undefined
            }
          />
        </dl>
      )}

      {/* Test Interest Rate Comparison Summary */}
      {hasTestRates && (
        <section className="panel mb-5 p-6">
          <h2 className="section-title">With the test rates</h2>
          <p className="mt-1">
            {formatMoney(Math.abs(totalTestDifference))} kr{' '}
            {totalTestDifference > 0 ? 'more' : 'less'} interest each month, or{' '}
            {formatMoney(Math.abs(totalTestDifference * 12))} kr a year.
          </p>
          <p className="mt-1 text-sm text-slate-600">
            {formatMoney(totalTestMonthlyInterest)} kr compared with{' '}
            {formatMoney(totalCurrentInterestForTestLoans)} kr today, on{' '}
            {loansWithTestRates.length}{' '}
            {loansWithTestRates.length === 1 ? 'loan' : 'loans'}.
          </p>
        </section>
      )}

      {isAdding && (
        <LoanForm
          users={users}
          existingCategories={existingCategories}
          onSubmit={(loan) => {
            onAddLoan(loan);
            setIsAdding(false);
          }}
          onCancel={() => setIsAdding(false)}
        />
      )}

      {hasCategorizedLoans ? (
        <div className="space-y-10">
          {groupedLoans.map(({ key, label, loans: groupLoans }) => {
            const groupTotals = computeLoanTotals(groupLoans);
            const applicableLoans = groupLoans.filter(
              (loan) => loan.monthlyPayment > 0 && loan.currentAmount > 0
            );
            const groupRepaymentSum = applicableLoans.reduce(
              (sum, loan) =>
                sum + Math.min(loan.monthlyPayment, loan.currentAmount),
              0
            );
            const canApplyGroup = applicableLoans.length > 0;
            const handleApplyGroupRepayments = () => {
              if (!canApplyGroup) return;
              const updates: Record<string, Partial<Loan>> = {};
              applicableLoans.forEach((loan) => {
                updates[loan.id] = {
                  currentAmount: Math.max(
                    0,
                    loan.currentAmount - loan.monthlyPayment
                  ),
                };
              });
              onUpdateLoans(updates);
            };

            return (
              <div key={key}>
                <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-3">
                    <h3 className="section-title">{label}</h3>
                    <button
                      type="button"
                      onClick={() => setRepaymentGroup(key)}
                      disabled={!canApplyGroup}
                      title={
                        canApplyGroup
                          ? `Apply this month's repayment to all ${applicableLoans.length} loan${applicableLoans.length !== 1 ? 's' : ''} in "${label}" (-${formatMoney(groupRepaymentSum)} kr total)`
                          : 'No loans in this category have a remaining balance'
                      }
                      aria-label={`Apply this month's repayment to all loans in ${label}`}
                      className="btn-secondary px-3 py-1"
                    >
                      <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                      Record repayments
                    </button>
                  </div>
                  <span className="text-xs text-slate-600">
                    {groupLoans.length} loan
                    {groupLoans.length !== 1 ? 's' : ''}
                  </span>
                </div>

                {repaymentGroup === key && (
                  <ConfirmDialog
                    title={`Record repayments for ${label}?`}
                    description={`This lowers ${applicableLoans.length} loan balances by ${formatMoney(groupRepaymentSum)} kr in total.`}
                    confirmLabel="Record repayments"
                    tone="primary"
                    onConfirm={handleApplyGroupRepayments}
                    onClose={() => setRepaymentGroup(null)}
                  />
                )}

                <p className="mb-3 text-sm text-slate-700">
                  {formatMoney(groupTotals.totalCurrentAmount)} kr left,{' '}
                  {formatMoney(groupTotals.totalMonthlyCost)} kr a month
                </p>

                <div className="panel divide-y divide-slate-200">
                  {groupLoans.map((loan) => (
                    <LoanCard
                      key={loan.id}
                      users={users}
                      loan={loan}
                      existingCategories={existingCategories}
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
              </div>
            );
          })}
        </div>
      ) : (
        <div className="panel divide-y divide-slate-200">
          {loans.map((loan) => (
            <LoanCard
              key={loan.id}
              users={users}
              loan={loan}
              existingCategories={existingCategories}
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
      )}

      {loans.length === 0 && !isAdding && (
        <p className="panel p-8 text-slate-700">
          No loans yet. Add one to see its monthly cost and interest.
        </p>
      )}
    </div>
  );
}

interface LoanTotals {
  totalOriginalAmount: number;
  totalCurrentAmount: number;
  totalMonthlyPayment: number;
  totalPaidOff: number;
  totalMonthlyInterest: number;
  totalMonthlyCost: number;
}

function computeLoanTotals(loans: Loan[]): LoanTotals {
  const totalOriginalAmount = loans.reduce(
    (sum, loan) => sum + loan.originalAmount,
    0
  );
  const totalCurrentAmount = loans.reduce(
    (sum, loan) => sum + loan.currentAmount,
    0
  );
  // Clamp each loan's payment at its remaining balance so a paid-off loan contributes 0
  // and a near-final payment can never exceed what's still owed.
  const totalMonthlyPayment = loans.reduce(
    (sum, loan) =>
      sum + Math.min(loan.monthlyPayment, Math.max(0, loan.currentAmount)),
    0
  );
  const totalMonthlyInterest = loans.reduce(
    (sum, loan) => sum + (loan.currentAmount * loan.interestRate) / 12,
    0
  );

  return {
    totalOriginalAmount,
    totalCurrentAmount,
    totalMonthlyPayment,
    totalPaidOff: totalOriginalAmount - totalCurrentAmount,
    totalMonthlyInterest,
    totalMonthlyCost: totalMonthlyPayment + totalMonthlyInterest,
  };
}

interface LoanGroup {
  key: string;
  label: string;
  loans: Loan[];
}

const UNCATEGORIZED_KEY = '__uncategorized__';

function groupLoansByCategory(loans: Loan[]): LoanGroup[] {
  const groups = new Map<string, LoanGroup>();

  loans.forEach((loan) => {
    const trimmed = loan.category?.trim();
    const key = trimmed || UNCATEGORIZED_KEY;
    const label = trimmed || 'Uncategorized';
    const existing = groups.get(key);
    if (existing) {
      existing.loans.push(loan);
    } else {
      groups.set(key, { key, label, loans: [loan] });
    }
  });

  return Array.from(groups.values()).sort((a, b) => {
    if (a.key === UNCATEGORIZED_KEY) return 1;
    if (b.key === UNCATEGORIZED_KEY) return -1;
    return a.label.localeCompare(b.label);
  });
}

function LoanFigure({
  label,
  amount,
  note,
  isHero = false,
}: {
  label: string;
  amount: number;
  note?: string;
  isHero?: boolean;
}) {
  return (
    <div className="p-6">
      <dt className="text-sm text-slate-600">{label}</dt>
      <dd
        className={`mt-1 text-2xl font-bold tracking-tight ${isHero ? 'text-blue-800' : ''}`}
      >
        {formatMoney(amount)} kr
      </dd>
      {note && <dd className="mt-1 text-sm text-slate-600">{note}</dd>}
    </div>
  );
}

interface LoanCardProps {
  users: User[];
  loan: Loan;
  existingCategories: string[];
  isEditing: boolean;
  onUpdate: (updates: Partial<Loan>) => void;
  onDelete: () => void;
  onStartEdit: () => void;
  onStopEdit: () => void;
}

function LoanCard({
  users,
  loan,
  existingCategories,
  isEditing,
  onUpdate,
  onDelete,
  onStartEdit,
  onStopEdit,
}: LoanCardProps) {
  const [isConfirmingRepayment, setIsConfirmingRepayment] = useState(false);
  const paidOffAmount = loan.originalAmount - loan.currentAmount;
  const paidOffPercentage =
    loan.originalAmount > 0 ? (paidOffAmount / loan.originalAmount) * 100 : 0;
  const monthlyInterest = (loan.currentAmount * loan.interestRate) / 12;
  const monthlyRepayment = loan.monthlyPayment; // Fixed repayment amount (amortering)
  const monthsToPayOff = loan.currentAmount / monthlyRepayment;

  const canApplyRepayment = monthlyRepayment > 0 && loan.currentAmount > 0;
  const handleApplyRepayment = () => {
    onUpdate({
      currentAmount: Math.max(0, loan.currentAmount - monthlyRepayment),
    });
  };

  const testMonthlyInterest = loan.testInterestRate
    ? (loan.currentAmount * loan.testInterestRate) / 12
    : null;
  const testMonthlyPayment = loan.testInterestRate
    ? testMonthlyInterest! + monthlyRepayment
    : null;
  const testDifference = testMonthlyInterest
    ? testMonthlyInterest - monthlyInterest
    : 0;

  const payer = users.find((user) => user.id === loan.paidBy);
  const monthlyParts = [
    {
      label: 'Interest',
      amount: monthlyInterest,
      color: COST_COLORS.loanInterest,
    },
    {
      label: 'Repayment',
      amount: monthlyRepayment,
      color: COST_COLORS.loanRepayment,
    },
  ];

  if (isEditing) {
    return (
      <LoanForm
        users={users}
        initialData={loan}
        existingCategories={existingCategories}
        onSubmit={onUpdate}
        onCancel={onStopEdit}
      />
    );
  }

  return (
    <article className="p-6">
      <div className="flex items-start gap-3">
        <Avatar user={payer} />
        <div className="min-w-0 flex-1">
          <h3 className="section-title break-words">{loan.name}</h3>
          <p className="text-sm text-slate-600">
            {payer ? `Paid by ${payer.name}, ` : ''}
            {(loan.interestRate * 100).toFixed(2)}% interest
          </p>
        </div>
        <div className="flex flex-shrink-0">
          <button
            type="button"
            onClick={onStartEdit}
            className="icon-btn"
            aria-label={`Edit ${loan.name}`}
            title={`Edit ${loan.name}`}
          >
            <Edit2 className="h-4 w-4" aria-hidden="true" />
          </button>
          <DeleteButton name={loan.name} onDelete={onDelete} />
        </div>
      </div>

      <div className="mt-6 grid items-center gap-x-10 gap-y-6 lg:grid-cols-2">
        <div className="flex items-center gap-6">
          <ProgressRing percentage={paidOffPercentage} />
          <div className="min-w-0">
            <p className="text-sm text-slate-600">Left to pay</p>
            <p className="whitespace-nowrap text-2xl font-bold tracking-tight">
              {formatMoney(loan.currentAmount)} kr
            </p>
            <p className="mt-1 text-sm text-slate-600">
              {formatMoney(paidOffAmount)} of {formatMoney(loan.originalAmount)}{' '}
              kr paid off
            </p>
            <p className="text-sm text-slate-600">
              {monthlyRepayment > 0
                ? `${Math.ceil(monthsToPayOff)} months to go`
                : 'No repayment set'}
            </p>
          </div>
        </div>
        <div>
          <p className="text-sm text-slate-600">Cost each month</p>
          <p className="mb-3 text-2xl font-bold tracking-tight">
            {formatMoney(monthlyInterest + monthlyRepayment)} kr
          </p>
          <SegmentedBar isThin parts={monthlyParts} />
          <div className="mt-1">
            <CostLegend parts={monthlyParts} />
          </div>
        </div>
      </div>

      {loan.testInterestRate && (
        <p className="mt-5 border-l-2 border-blue-700 pl-3 text-sm">
          At {(loan.testInterestRate * 100).toFixed(2)}% it would cost{' '}
          <strong className="money">
            {formatMoney(testMonthlyPayment!)} kr
          </strong>{' '}
          a month ({testDifference > 0 ? '+' : ''}
          {formatMoney(testDifference)} kr).
        </p>
      )}

      <div className="mt-4 flex justify-end">
        <button
          type="button"
          onClick={() => setIsConfirmingRepayment(true)}
          disabled={!canApplyRepayment}
          className="btn-secondary"
        >
          Record repayment
        </button>
      </div>

      {isConfirmingRepayment && (
        <ConfirmDialog
          title={`Record repayment on ${loan.name}?`}
          description={`This lowers the balance by ${formatMoney(Math.min(monthlyRepayment, loan.currentAmount))} kr.`}
          confirmLabel="Record repayment"
          tone="primary"
          onConfirm={handleApplyRepayment}
          onClose={() => setIsConfirmingRepayment(false)}
        />
      )}
    </article>
  );
}

interface LoanFormProps {
  users: User[];
  initialData?: Loan;
  existingCategories: string[];
  onSubmit: (loan: Omit<Loan, 'id'>) => void;
  onCancel: () => void;
}

function LoanForm({
  users,
  initialData,
  existingCategories,
  onSubmit,
  onCancel,
}: LoanFormProps) {
  const fieldId = useId();
  const [name, setName] = useState(initialData?.name || '');
  const [category, setCategory] = useState(initialData?.category || '');
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

  // Repayment splitting
  const [isRepaymentShared, setIsRepaymentShared] = useState(
    initialData?.isRepaymentShared ?? true
  );
  const [repaymentSplitType, setRepaymentSplitType] = useState<
    'percentage' | 'equal'
  >(initialData?.repaymentSplitType || 'equal');

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

    // Repayment split data
    const repaymentSplitData: { [userId: string]: number } = {};
    if (isRepaymentShared) {
      if (repaymentSplitType === 'percentage') {
        users.forEach((user) => {
          repaymentSplitData[user.id] =
            totalIncome > 0
              ? user.monthlyIncome / totalIncome
              : 1 / users.length;
        });
      } else {
        users.forEach((user) => {
          repaymentSplitData[user.id] = 1 / users.length;
        });
      }
    }

    const trimmedCategory = category.trim();

    onSubmit({
      name: name.trim(),
      category: trimmedCategory ? trimmedCategory : undefined,
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

      // Repayment splitting
      isRepaymentShared,
      repaymentSplitType,
      repaymentSplitData: isRepaymentShared ? repaymentSplitData : undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="form-panel mb-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <div>
          <label htmlFor={`${fieldId}-1`} className="field-label">
            Loan name
          </label>
          <input
            id={`${fieldId}-1`}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="field"
            placeholder="e.g., Home Loan Part 1"
            required
          />
        </div>
        <div>
          <label htmlFor={`${fieldId}-2`} className="field-label">
            Category (optional)
          </label>
          <input
            id={`${fieldId}-2`}
            type="text"
            list="loan-category-suggestions"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="field"
            placeholder="e.g., Housing, Car, SMS loans"
          />
          <datalist id="loan-category-suggestions">
            {existingCategories.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <div>
          <label htmlFor={`${fieldId}-3`} className="field-label">
            Original amount (kr)
          </label>
          <input
            id={`${fieldId}-3`}
            type="number"
            value={originalAmount}
            onChange={(e) => setOriginalAmount(e.target.value)}
            className="field"
            placeholder="1500000"
            required
            min="0"
          />
        </div>
        <div>
          <label htmlFor={`${fieldId}-4`} className="field-label">
            Current balance (kr)
          </label>
          <input
            id={`${fieldId}-4`}
            type="number"
            value={currentAmount}
            onChange={(e) => setCurrentAmount(e.target.value)}
            className="field"
            placeholder="1300000"
            required
            min="0"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <div>
          <label htmlFor={`${fieldId}-5`} className="field-label">
            Interest rate (%)
          </label>
          <input
            id={`${fieldId}-5`}
            type="number"
            value={interestRate}
            onChange={(e) => setInterestRate(e.target.value)}
            className="field"
            placeholder="3.5"
            required
            min="0"
            step="0.01"
          />
        </div>
        <div>
          <label htmlFor={`${fieldId}-6`} className="field-label">
            Test interest rate (%) - Optional
          </label>
          <input
            id={`${fieldId}-6`}
            type="number"
            value={testInterestRate}
            onChange={(e) => setTestInterestRate(e.target.value)}
            className="field"
            placeholder="2.8"
            min="0"
            step="0.01"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div>
          <label htmlFor={`${fieldId}-7`} className="field-label">
            Monthly repayment (kr)
          </label>
          <input
            id={`${fieldId}-7`}
            type="number"
            value={monthlyPayment}
            onChange={(e) => setMonthlyPayment(e.target.value)}
            className="field"
            placeholder="8500"
            required
            min="0"
          />
        </div>
      </div>

      {/* Payment & Splitting Controls */}
      {users.length > 1 && (
        <div className="border-t border-slate-200 pt-4 mt-4">
          <h4 className="font-medium text-slate-900 mb-3">
            Payment & splitting
          </h4>

          <div className="mb-4">
            <label htmlFor={`${fieldId}-8`} className="field-label">
              Paid by
            </label>
            <select
              id={`${fieldId}-8`}
              value={paidBy}
              onChange={(e) => setPaidBy(e.target.value)}
              className="field"
              required
            >
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
            </select>
          </div>

          {/* Interest and Repayment Splitting - Side by Side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Interest Splitting */}
            <div className="border-t border-slate-300 pt-4">
              <h5 className="font-medium text-slate-800 mb-3">
                Interest splitting
              </h5>
              <div className="space-y-3">
                <div>
                  <label htmlFor={`${fieldId}-9`} className="field-label">
                    Interest sharing
                  </label>
                  <select
                    id={`${fieldId}-9`}
                    value={isInterestShared ? 'shared' : 'personal'}
                    onChange={(e) =>
                      setIsInterestShared(e.target.value === 'shared')
                    }
                    className="field"
                  >
                    <option value="shared">Household cost</option>
                    <option value="personal">Personal cost</option>
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

            {/* Repayment Splitting */}
            <div className="border-t border-slate-300 pt-4">
              <h5 className="font-medium text-slate-800 mb-3">
                Repayment splitting
              </h5>
              <div className="space-y-3">
                <div>
                  <label htmlFor={`${fieldId}-10`} className="field-label">
                    Repayment sharing
                  </label>
                  <select
                    id={`${fieldId}-10`}
                    value={isRepaymentShared ? 'shared' : 'personal'}
                    onChange={(e) =>
                      setIsRepaymentShared(e.target.value === 'shared')
                    }
                    className="field"
                  >
                    <option value="shared">Household cost</option>
                    <option value="personal">Personal cost</option>
                  </select>
                </div>

                {isRepaymentShared && (
                  <SplitMethodSelector
                    value={repaymentSplitType as any}
                    onChange={(value) =>
                      setRepaymentSplitType(value as 'percentage' | 'equal')
                    }
                    name="repaymentSplitMethod"
                  />
                )}
              </div>

              {isRepaymentShared &&
                repaymentSplitType === 'percentage' &&
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
        submitLabel={`${initialData ? 'Save' : 'Add'} loan`}
        onCancel={onCancel}
      />
    </form>
  );
}
