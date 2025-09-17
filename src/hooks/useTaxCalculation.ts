import { useMemo } from 'react';
import { calculateAfterTaxIncomeWithTablesSync } from '../services/taxService';

interface TaxCalculationResult {
  monthlyAfterTax: number;
  isLoading: boolean;
  error: string | null;
  usedTaxTables: boolean;
  tableNumber?: number;
}

export function useTaxCalculation(
  yearlyIncome: number,
  municipalityCode: string
): TaxCalculationResult {
  const result = useMemo(() => {
    if (yearlyIncome <= 0) {
      return {
        monthlyAfterTax: 0,
        isLoading: false,
        error: null,
        usedTaxTables: false,
      };
    }

    if (!municipalityCode) {
      return {
        monthlyAfterTax: 0,
        isLoading: false,
        error: 'Municipality required for tax calculation',
        usedTaxTables: false,
      };
    }

    try {
      const calculation = calculateAfterTaxIncomeWithTablesSync(
        yearlyIncome,
        municipalityCode
      );
      return {
        monthlyAfterTax: calculation.monthlyAfterTax,
        isLoading: false,
        error: null,
        usedTaxTables: calculation.usedTaxTables,
        tableNumber: calculation.tableNumber,
      };
    } catch (error) {
      console.error('Tax calculation failed:', error);
      return {
        monthlyAfterTax: 0,
        isLoading: false,
        error: 'Tax calculation failed',
        usedTaxTables: false,
      };
    }
  }, [yearlyIncome, municipalityCode]);

  return result;
}
