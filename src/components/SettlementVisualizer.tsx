import { ArrowRight, Users, DollarSign } from 'lucide-react';
import type { User, Settlement } from '../types';
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
      loanMortgages: number;
    };
  };
}

export function SettlementVisualizer({
  users,
  settlements,
  detailedBalances,
}: SettlementVisualizerProps) {
  const getUserById = (id: string) => users.find((u) => u.id === id);
  const totalSettlementAmount = settlements.reduce(
    (sum, s) => sum + s.amount,
    0
  );

  if (settlements.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
          <Users className="w-5 h-5" />
          Settlement Overview
        </h2>
        <div className="text-center py-8">
          <Users className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <p className="text-lg text-green-600 font-medium">All settled up!</p>
          <p className="text-gray-500 mt-2">
            No payments needed between users.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
          <Users className="w-5 h-5" />
          Settlement Overview
        </h2>
        <div className="text-sm text-gray-500 flex items-center gap-1">
          <DollarSign className="w-4 h-4" />
          Total: {formatMoney(totalSettlementAmount)} kr
        </div>
      </div>

      <div className="space-y-4 mb-6">
        {settlements.map((settlement, index) => {
          const fromUser = getUserById(settlement.from);
          const toUser = getUserById(settlement.to);

          if (!fromUser || !toUser) return null;

          return (
            <SettlementCard
              key={`${settlement.from}-${settlement.to}-${index}`}
              settlement={settlement}
              fromUser={fromUser}
              toUser={toUser}
            />
          );
        })}
      </div>

      {/* Detailed Balance Breakdown */}
      <div className="mt-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Detailed Balance Breakdown
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {users.map((user) => {
            const balance = detailedBalances[user.id];
            if (!balance || Math.abs(balance.total) < 0.01) return null;

            return (
              <div
                key={user.id}
                className="border border-gray-200 rounded-lg p-4 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-4 h-4 rounded-full flex-shrink-0"
                      style={{ backgroundColor: user.color }}
                    />
                    <span className="font-medium text-gray-900">
                      {user.name}
                    </span>
                  </div>
                  <span
                    className={`font-semibold ${
                      balance.total > 0 ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {balance.total > 0 ? '+' : ''}
                    {formatMoney(balance.total)} kr
                  </span>
                </div>

                <div className="space-y-1 text-sm">
                  {Math.abs(balance.sharedExpenses) > 0.01 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Household Expenses:</span>
                      <span
                        className={
                          balance.sharedExpenses > 0
                            ? 'text-green-600'
                            : 'text-red-600'
                        }
                      >
                        {balance.sharedExpenses > 0 ? '+' : ''}
                        {formatMoney(balance.sharedExpenses)} kr
                      </span>
                    </div>
                  )}

                  {Object.entries(balance.assets).map(([assetName, amount]) => {
                    if (Math.abs(amount) < 0.01) return null;
                    return (
                      <div key={assetName} className="flex justify-between">
                        <span className="text-gray-600">
                          {assetName} (asset):
                        </span>
                        <span
                          className={
                            amount > 0 ? 'text-green-600' : 'text-red-600'
                          }
                        >
                          {amount > 0 ? '+' : ''}
                          {formatMoney(amount)} kr
                        </span>
                      </div>
                    );
                  })}

                  {Math.abs(balance.loanInterests) > 0.01 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Loan Interests:</span>
                      <span
                        className={
                          balance.loanInterests > 0
                            ? 'text-green-600'
                            : 'text-red-600'
                        }
                      >
                        {balance.loanInterests > 0 ? '+' : ''}
                        {formatMoney(balance.loanInterests)} kr
                      </span>
                    </div>
                  )}

                  {Math.abs(balance.loanMortgages) > 0.01 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Loan Principal:</span>
                      <span
                        className={
                          balance.loanMortgages > 0
                            ? 'text-green-600'
                            : 'text-red-600'
                        }
                      >
                        {balance.loanMortgages > 0 ? '+' : ''}
                        {formatMoney(balance.loanMortgages)} kr
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

interface SettlementCardProps {
  settlement: Settlement;
  fromUser: User;
  toUser: User;
}

function SettlementCard({ settlement, fromUser, toUser }: SettlementCardProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 bg-gradient-to-r from-red-50 to-green-50 border border-gray-200 rounded-lg gap-2">
      <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className="w-4 h-4 rounded-full flex-shrink-0"
            style={{ backgroundColor: fromUser.color }}
          />
          <span className="font-medium text-gray-900 truncate">
            {fromUser.name}
          </span>
        </div>
        <ArrowRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
        <div className="flex items-center gap-2 min-w-0">
          <div
            className="w-4 h-4 rounded-full flex-shrink-0"
            style={{ backgroundColor: toUser.color }}
          />
          <span className="font-medium text-gray-900 truncate">
            {toUser.name}
          </span>
        </div>
      </div>

      <div className="text-right">
        <div className="text-lg font-semibold text-gray-900">
          {formatMoney(settlement.amount)} kr
        </div>
        <div className="text-sm text-gray-500">Transfer needed</div>
      </div>
    </div>
  );
}

// interface SettlementSummaryProps {
//   users: User[];
//   settlements: Settlement[];
// }

/*
function SettlementSummary({ users, settlements }: SettlementSummaryProps) {
  const userBalances = users.map((user) => {
    const owes = settlements
      .filter((s) => s.from === user.id)
      .reduce((sum, s) => sum + s.amount, 0);

    const owedBy = settlements
      .filter((s) => s.to === user.id)
      .reduce((sum, s) => sum + s.amount, 0);

    const netBalance = owedBy - owes;

    return {
      user,
      owes,
      owedBy,
      netBalance,
    };
  });

  return (
    <div className="border-t border-gray-200 pt-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">
        Individual Balance Summary
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {userBalances.map(({ user, owes, owedBy, netBalance }) => (
          <div
            key={user.id}
            className="p-4 bg-gray-50 rounded-lg border border-gray-200"
          >
            <div className="flex items-center gap-2 mb-3">
              <div
                className="w-4 h-4 rounded-full flex-shrink-0"
                style={{ backgroundColor: user.color }}
              />
              <span className="font-medium text-gray-900">{user.name}</span>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Owes others:</span>
                <span className="text-red-600 font-medium">
                  {owes > 0 ? `${formatMoney(owes)} kr` : '—'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Owed by others:</span>
                <span className="text-green-600 font-medium">
                  {owedBy > 0 ? `${formatMoney(owedBy)} kr` : '—'}
                </span>
              </div>
              <div className="flex justify-between pt-2 border-t border-gray-300">
                <span className="font-medium text-gray-700">Net balance:</span>
                <span
                  className={`font-bold ${
                    netBalance > 0
                      ? 'text-green-600'
                      : netBalance < 0
                        ? 'text-red-600'
                        : 'text-gray-600'
                  }`}
                >
                  {netBalance === 0
                    ? 'Even'
                    : `${formatMoney(Math.abs(netBalance))} kr`}
                </span>
              </div>
              {netBalance !== 0 && (
                <div className="text-xs text-gray-500 text-center mt-1">
                  {netBalance > 0 ? 'Will receive' : 'Will pay'}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h4 className="text-sm font-medium text-blue-900 mb-2">
          💡 How to use this information:
        </h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Each settlement shows who needs to pay whom</li>
          <li>• Complete all settlements to balance everyone's expenses</li>
          <li>• Net balance shows each person's overall position</li>
          <li>• Variable costs are included in the calculations</li>
        </ul>
      </div>
    </div>
  );
}
*/
