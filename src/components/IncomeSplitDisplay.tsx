import type { User } from '../types';
import { formatMoney } from '../utils/expenseCalculations';

interface IncomeSplitDisplayProps {
  users: User[];
  splitData: { [userId: string]: number };
  title?: string;
  bgColor?: string;
  textColor?: string;
  titleColor?: string;
}

export function IncomeSplitDisplay({
  users,
  splitData,
  title = 'Income-based split:',
  bgColor = 'bg-hover',
  textColor = 'text-ink-soft',
  titleColor = 'text-ink',
}: IncomeSplitDisplayProps) {
  const totalIncome = users.reduce((sum, user) => sum + user.monthlyIncome, 0);

  return (
    <div className={`mt-3 p-3 ${bgColor} rounded-md`}>
      <p className={`text-sm ${titleColor} font-medium mb-2`}>{title}</p>
      <div className={`text-sm ${textColor} space-y-1`}>
        {users.map((user) => {
          const percentage = ((splitData[user.id] || 0) * 100).toFixed(1);
          return (
            <div key={user.id} className="flex justify-between">
              <span>{user.name}:</span>
              <span>
                {percentage}% ({formatMoney(user.monthlyIncome)} kr)
              </span>
            </div>
          );
        })}
      </div>
      <div className={`mt-2 pt-2 border-t border-line-strong`}>
        <div
          className={`flex justify-between text-sm font-semibold ${titleColor}`}
        >
          <span>Total household income:</span>
          <span>{formatMoney(totalIncome)} kr</span>
        </div>
      </div>
    </div>
  );
}
