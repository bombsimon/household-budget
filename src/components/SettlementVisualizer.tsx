import { ArrowRight } from 'lucide-react';
import type { User, Settlement } from '../types';
import { Avatar } from './Avatar';
import { formatMoney } from '../utils/expenseCalculations';

interface SettlementVisualizerProps {
  users: User[];
  settlements: Settlement[];
  detailedBalances: {
    [userId: string]: {
      total: number;
      sharedExpenses: number;
      assets: { [assetName: string]: number };
      loanInterests: number;
      loanRepayments: number;
    };
  };
}

const formatSigned = (amount: number): string =>
  `${amount > 0 ? '+' : ''}${formatMoney(amount)} kr`;

export function SettlementVisualizer({
  users,
  settlements,
  detailedBalances,
}: SettlementVisualizerProps) {
  const getUserName = (userId: string) =>
    users.find((user) => user.id === userId)?.name ?? 'Unknown';

  return (
    <div>
      <h1 className="page-title">Transfers this month</h1>
      {settlements.length === 0 ? (
        <p className="panel mt-5 p-8">Nobody owes anything.</p>
      ) : (
        <>
          <ul className="panel mt-5 space-y-5 p-6">
            {settlements.map((settlement) => (
              <li key={`${settlement.from}-${settlement.to}`}>
                <p className="flex flex-wrap items-center gap-2">
                  <Avatar
                    user={users.find((user) => user.id === settlement.from)}
                  />
                  <span className="text-lg">
                    {getUserName(settlement.from)}
                  </span>
                  <ArrowRight className="h-4 w-4" aria-label="pays" />
                  <Avatar
                    user={users.find((user) => user.id === settlement.to)}
                  />
                  <span className="text-lg">{getUserName(settlement.to)}</span>
                </p>
                <p className="money mt-2 text-4xl font-bold tracking-tight text-blue-800">
                  {formatMoney(settlement.amount)} kr
                </p>
              </li>
            ))}
          </ul>

          <h2 className="section-title mb-1 mt-10">How it adds up</h2>
          <p className="mb-4 text-sm text-slate-600">
            Plus means the person paid more than their share, minus means less.
            Personal loans are not part of a transfer.
          </p>
          <div className="grid gap-5 md:grid-cols-2">
            {users.map((user) => {
              const balance = detailedBalances[user.id];
              if (!balance) return null;

              const lines = [
                {
                  key: 'expenses',
                  label: 'Household expenses',
                  amount: balance.sharedExpenses,
                },
                ...Object.entries(balance.assets).map(([name, amount]) => ({
                  key: `asset-${name}`,
                  label: name,
                  amount,
                })),
                {
                  key: 'interest',
                  label: 'Loan interest',
                  amount: balance.loanInterests,
                },
                {
                  key: 'repayment',
                  label: 'Loan repayment',
                  amount: balance.loanRepayments,
                },
              ].filter((line) => Math.abs(line.amount) > 0.01);
              // The balance total also counts personal loans, which no transfer covers.
              const shownTotal = lines.reduce(
                (sum, line) => sum + line.amount,
                0
              );

              return (
                <section key={user.id} className="panel p-6">
                  <h3 className="mb-4 flex items-center gap-3 font-semibold">
                    <Avatar user={user} />
                    {user.name}
                  </h3>
                  <dl className="space-y-2 text-sm">
                    {lines.map((line) => (
                      <div
                        key={line.key}
                        className="flex justify-between gap-4"
                      >
                        <dt className="text-slate-700">{line.label}</dt>
                        <dd className="money">{formatSigned(line.amount)}</dd>
                      </div>
                    ))}
                    <div className="flex justify-between gap-4 border-t border-slate-400 pt-2 font-semibold">
                      <dt>Total</dt>
                      <dd className="money ledger-total">
                        {formatSigned(shownTotal)}
                      </dd>
                    </div>
                  </dl>
                </section>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
