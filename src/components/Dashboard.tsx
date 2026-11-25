import type { ReactNode } from 'react';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import type {
  User,
  BudgetSummary,
  UserBudgetBreakdown,
  ExpenseCategory,
  Asset,
  Loan,
  Settlement,
} from '../types';
import { Avatar } from './Avatar';
import {
  CostDonut,
  CostLegend,
  SegmentedBar,
  type CostPart,
} from './CostCharts';
import { COST_COLORS } from '../utils/costColors';
import { getMonthlyAmount, formatMoney } from '../utils/expenseCalculations';

interface DashboardProps {
  householdPath: string;
  users: User[];
  budgetSummary: BudgetSummary;
  userBreakdowns: UserBudgetBreakdown[];
  categories: ExpenseCategory[];
  assets: Asset[];
  loans: Loan[];
  settlements: Settlement[];
}

export function Dashboard({
  householdPath,
  users,
  budgetSummary,
  userBreakdowns,
  categories,
  assets,
  loans,
  settlements,
}: DashboardProps) {
  if (users.length === 0) {
    return (
      <section className="panel max-w-lg p-8">
        <h2 className="page-title">Start with who lives here</h2>
        <p className="mt-2 text-slate-700">
          Add each person with their monthly income and municipality. Then add
          the expenses you share.
        </p>
        <Link to={`${householdPath}/users`} className="btn-primary mt-4">
          Add a person
        </Link>
      </section>
    );
  }

  const usersWithoutMunicipality = users.filter(
    (user) => !user.municipalityCode
  );
  const isIncomeKnown = usersWithoutMunicipality.length === 0;

  const fixedExpenses = categories
    .flatMap((category) => category.expenses)
    .filter((expense) => !expense.isBudgeted);
  const householdTotal = fixedExpenses
    .filter((expense) => expense.isShared)
    .reduce((sum, expense) => sum + getMonthlyAmount(expense), 0);
  const assetTotal = assets
    .flatMap((asset) => asset.expenses || [])
    .filter((expense) => !expense.isBudgeted)
    .reduce((sum, expense) => sum + getMonthlyAmount(expense), 0);
  const interestTotal = loans.reduce(
    (sum, loan) => sum + (loan.currentAmount * loan.interestRate) / 12,
    0
  );
  const repaymentTotal = loans.reduce(
    (sum, loan) => sum + loan.monthlyPayment,
    0
  );
  const budgetedTotal =
    budgetSummary.totalBudgetedSharedExpenses +
    budgetSummary.totalBudgetedPersonalExpenses;

  const costs: CostPart[] = [
    {
      label: 'Household expenses',
      amount: householdTotal,
      color: COST_COLORS.household,
    },
    {
      label: 'Loan interest',
      amount: interestTotal,
      color: COST_COLORS.loanInterest,
    },
    {
      label: 'Loan repayment',
      amount: repaymentTotal,
      color: COST_COLORS.loanRepayment,
    },
    { label: 'Assets', amount: assetTotal, color: COST_COLORS.assets },
    {
      label: 'Personal expenses',
      amount: budgetSummary.totalPersonalExpenses,
      color: COST_COLORS.personal,
    },
  ];
  const hasCosts = costs.some((part) => part.amount > 0);
  const left = budgetSummary.remainingIncome;

  return (
    <div className="space-y-5">
      {!isIncomeKnown && (
        <p className="rounded-xl bg-amber-50 p-4 text-sm ring-1 ring-amber-400">
          Choose a municipality for{' '}
          {usersWithoutMunicipality.map((user) => user.name).join(', ')} to see
          income after tax and what is left.{' '}
          <Link to={`${householdPath}/users`} className="underline">
            Go to people
          </Link>
        </p>
      )}

      <div className="grid gap-5 lg:grid-cols-3 [&>*]:min-w-0">
        <section
          aria-labelledby="left-title"
          className={`panel p-6 ${users.length > 1 ? 'lg:col-span-2' : 'lg:col-span-3'}`}
        >
          <h1 className="sr-only">Overview</h1>
          <h2 id="left-title" className="section-title">
            Left each month
          </h2>
          <p className="mt-1 whitespace-nowrap text-4xl font-bold tracking-tight text-blue-800 sm:text-5xl">
            {isIncomeKnown ? `${formatMoney(left)} kr` : 'Not known yet'}
          </p>
          <dl className="mt-8 grid grid-cols-2 gap-x-6 gap-y-4 border-t border-slate-200 pt-5 sm:grid-cols-4">
            <HeroFigure label="Before tax">
              {formatMoney(budgetSummary.totalIncome)} kr
            </HeroFigure>
            <HeroFigure label="After tax">
              {isIncomeKnown
                ? `${formatMoney(budgetSummary.afterTaxIncome)} kr`
                : 'Not known'}
            </HeroFigure>
            <HeroFigure label="Fixed costs">
              {formatMoney(
                budgetSummary.totalSharedExpenses +
                  budgetSummary.totalPersonalExpenses
              )}{' '}
              kr
            </HeroFigure>
            <HeroFigure label="Budgeted, not deducted">
              {formatMoney(budgetedTotal)} kr
            </HeroFigure>
          </dl>
        </section>

        {users.length > 1 && (
          <section
            aria-labelledby="transfer-title"
            className="panel flex flex-col p-6"
          >
            <h2 id="transfer-title" className="section-title">
              Transfer this month
            </h2>
            <div className="flex flex-1 flex-col justify-center gap-5 py-5">
              {settlements.length === 0 && <p>Nobody owes anything.</p>}
              {settlements.map((settlement) => (
                <div key={`${settlement.from}-${settlement.to}`}>
                  <div className="flex items-center gap-3">
                    <Person users={users} userId={settlement.from} />
                    <ArrowRight
                      className="h-5 w-5 flex-shrink-0 text-slate-500"
                      aria-label="pays"
                    />
                    <Person users={users} userId={settlement.to} />
                  </div>
                  <p className="mt-3 text-2xl font-bold tracking-tight">
                    {formatMoney(settlement.amount)} kr
                  </p>
                </div>
              ))}
            </div>
            <Link
              to={`${householdPath}/settlements`}
              className="py-1 text-sm text-blue-800 underline"
            >
              See how it adds up
            </Link>
          </section>
        )}
      </div>

      {isIncomeKnown && hasCosts && left >= 0 && (
        <section className="panel p-6" aria-labelledby="income-title">
          <h2 id="income-title" className="section-title mb-4">
            Where {formatMoney(budgetSummary.afterTaxIncome)} kr goes
          </h2>
          <SegmentedBar
            parts={[
              ...costs,
              { label: 'Left', amount: left, color: COST_COLORS.left },
            ]}
          />
          <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm">
            {[
              ...costs,
              { label: 'Left', amount: left, color: COST_COLORS.left },
            ]
              .filter((part) => part.amount > 0)
              .map((part) => (
                <li key={part.label} className="flex items-center gap-2">
                  <span
                    aria-hidden="true"
                    className="h-3 w-3 rounded-sm"
                    style={{ backgroundColor: part.color }}
                  />
                  {part.label}
                </li>
              ))}
          </ul>
        </section>
      )}

      <div className="grid gap-5 lg:grid-cols-2 [&>*]:min-w-0">
        <section className="panel p-6" aria-labelledby="costs-title">
          <h2 id="costs-title" className="section-title mb-4">
            Fixed costs
          </h2>
          {hasCosts ? (
            <>
              <CostDonut parts={costs} />
              <div className="mt-5">
                <CostLegend parts={costs} />
              </div>
            </>
          ) : (
            <p className="text-slate-700">
              No fixed costs yet.{' '}
              <Link to={`${householdPath}/expenses`} className="underline">
                Add household expenses
              </Link>
            </p>
          )}
        </section>

        <section className="panel p-6" aria-labelledby="people-title">
          <h2 id="people-title" className="section-title mb-4">
            Left per person
          </h2>
          <ul className="divide-y divide-slate-200">
            {userBreakdowns.map((breakdown) => {
              const user = users.find(
                (candidate) => candidate.id === breakdown.userId
              );
              if (!user) return null;

              return (
                <li key={user.id}>
                  <Link
                    to={`${householdPath}/users/${user.id}`}
                    className="-mx-3 block rounded px-3 py-4 hover:bg-slate-50"
                  >
                    <span className="flex items-center gap-3">
                      <Avatar user={user} />
                      <span className="min-w-0 flex-1 truncate font-semibold">
                        {user.name}
                      </span>
                      <span className="money text-xl font-bold">
                        {user.municipalityCode
                          ? `${formatMoney(breakdown.remainingAfterExpenses)} kr`
                          : 'No municipality'}
                      </span>
                    </span>
                    <span className="mt-4 block">
                      <SegmentedBar
                        isThin
                        parts={[
                          {
                            label: 'Household share',
                            amount: breakdown.sharedExpensesOwed,
                            color: COST_COLORS.household,
                          },
                          {
                            label: 'Personal',
                            amount: breakdown.personalExpenses,
                            color: COST_COLORS.personal,
                          },
                          {
                            label: 'Left',
                            amount: breakdown.remainingAfterExpenses,
                            color: COST_COLORS.left,
                          },
                        ]}
                      />
                    </span>
                    <span className="mt-2 block text-sm text-slate-600">
                      Household share{' '}
                      {formatMoney(breakdown.sharedExpensesOwed)} kr, personal{' '}
                      {formatMoney(breakdown.personalExpenses)} kr
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
          {users.length > 1 && budgetSummary.totalIncome > 0 && (
            <div className="mt-6 border-t border-slate-200 pt-5">
              <h3 className="mb-3 font-semibold">Income before tax</h3>
              <CostLegend
                parts={users.map((user) => ({
                  label: user.name,
                  amount: user.monthlyIncome,
                  color: user.color,
                }))}
              />
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function Person({ users, userId }: { users: User[]; userId: string }) {
  const user = users.find((candidate) => candidate.id === userId);

  return (
    <span className="flex min-w-0 items-center gap-2">
      <Avatar user={user} />
      <span className="truncate font-medium">
        {user?.name.split(' ')[0] ?? 'Unknown'}
      </span>
    </span>
  );
}

function HeroFigure({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div>
      <dt className="text-sm text-slate-600">{label}</dt>
      <dd className="money mt-0.5 font-semibold">{children}</dd>
    </div>
  );
}
