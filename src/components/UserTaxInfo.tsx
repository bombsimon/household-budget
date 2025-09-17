import { Loader, AlertTriangle } from 'lucide-react';
import { formatMoney } from '../utils/expenseCalculations';
import { useTaxCalculation } from '../hooks/useTaxCalculation';
import type { User } from '../types';

interface UserTaxInfoProps {
  user: User;
}

export function UserTaxInfo({ user }: UserTaxInfoProps) {
  const { monthlyAfterTax, isLoading, error, tableNumber } = useTaxCalculation(
    user.monthlyIncome * 12,
    user.municipalityCode
  );

  return (
    <div className="text-sm text-gray-500 space-y-1 text-left">
      <p>Monthly Income: {formatMoney(user.monthlyIncome)} kr</p>
      <p>Municipality: {user.municipalityName}</p>
      <div className="flex items-center gap-2">
        <span>After Tax:</span>
        {isLoading ? (
          <div className="flex items-center gap-1">
            <Loader className="w-3 h-3 animate-spin" />
            <span className="text-gray-400">Calculating...</span>
          </div>
        ) : (
          <>
            <span>{formatMoney(monthlyAfterTax)} kr</span>
            {error && <AlertTriangle className="w-3 h-3 text-orange-500" />}
          </>
        )}
      </div>
      {tableNumber && (
        <p className="text-xs text-gray-400">Tax table: {tableNumber}</p>
      )}
    </div>
  );
}
