import { Loader } from 'lucide-react';
import { formatMoney } from '../utils/expenseCalculations';
import { useTaxCalculation } from '../hooks/useTaxCalculation';
import type { User } from '../types';

interface UserTaxInfoProps {
  user: User;
}

export function UserTaxInfo({ user }: UserTaxInfoProps) {
  const { monthlyAfterTax, isLoading, error, tableNumber, usedTaxTables } =
    useTaxCalculation(user.monthlyIncome * 12, user.municipalityCode);

  return (
    <div className="mt-1 space-y-0.5 text-sm text-ink-soft">
      <p>Before tax: {formatMoney(user.monthlyIncome)} kr</p>

      <div className="flex items-center gap-1">
        <span>After tax:</span>
        {isLoading ? (
          <div className="flex items-center gap-1">
            <Loader className="w-3 h-3 animate-spin" />
            <span className="text-disabled">Calculating...</span>
          </div>
        ) : (
          <>
            <span>
              {error
                ? error === 'Municipality required for tax calculation'
                  ? 'choose a municipality'
                  : 'could not be calculated'
                : `${formatMoney(monthlyAfterTax)} kr`}
              {!error &&
                !usedTaxTables &&
                user.monthlyIncome > 0 &&
                ' (estimate, no tax table match)'}
            </span>
          </>
        )}
      </div>
      {tableNumber && (
        <p className="text-muted">
          {user.municipalityName}, tax table {tableNumber}
        </p>
      )}
    </div>
  );
}
