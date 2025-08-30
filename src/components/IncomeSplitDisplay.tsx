import type { User } from '../types';
import { formatMoney } from '../utils/expenseCalculations';

interface IncomeSplitDisplayProps {
  users: User[];
  splitData: { [userId: string]: number };
  title?: string;
  bgColor?: string;
  textColor?: string;
  titleColor?: string;
  showExplanation?: boolean;
}

export function IncomeSplitDisplay({
  users,
  splitData,
  title = 'Income-based split:',
  bgColor = 'bg-blue-50',
  textColor = 'text-blue-700',
  titleColor = 'text-blue-800',
  showExplanation = true,
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
      <div className={`mt-2 pt-2 border-t border-blue-200`}>
        <div
          className={`flex justify-between text-sm font-semibold ${titleColor}`}
        >
          <span>Total Household Income:</span>
          <span>{formatMoney(totalIncome)} kr</span>
        </div>
      </div>
      {showExplanation && (
        <div className="mt-2 pt-2 border-t border-blue-200">
          <p className={`text-xs ${textColor}`}>
            The percentages above are automatically calculated based on each
            person's share of the total household income. This ensures fair cost
            sharing proportional to earnings.
          </p>
        </div>
      )}
    </div>
  );
}
