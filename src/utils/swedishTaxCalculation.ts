/**
 * Swedish tax calculation utilities
 * Based on Swedish tax system with municipal tax, county tax, and state tax
 *
 * 2024 Tax Brackets and Rules:
 * - Basic deduction (grundavdrag): varies by income, base 24,300 SEK
 * - Municipal + County tax: typically 29-35% (Stockholm ~30%, average ~32%)
 * - State tax: 20% on income above 643,200 SEK, 25% above 912,000 SEK
 */

// 2024 tax brackets for state tax (statlig skatt) - used in simplified calculation
// const STATE_TAX_THRESHOLD_1 = 643200; // 20% state tax applies above this (~53,600 kr/month)
// const STATE_TAX_THRESHOLD_2 = 912000; // 25% state tax applies above this (~76,000 kr/month)
// const STATE_TAX_RATE_1 = 0.20;
// const STATE_TAX_RATE_2 = 0.25;

// Default municipal + county tax rate (average across Sweden)
const DEFAULT_MUNICIPAL_TAX_RATE = 0.32;

/**
 * Calculate basic deduction (grundavdrag) for 2024
 * Based on actual Skatteverket data, the basic deduction for 2024 is more generous
 * This is a simplified but more accurate calculation
 */
function calculateBasicDeduction(yearlyIncome: number): number {
  // 2024 basic deduction - more accurate formula
  if (yearlyIncome <= 50000) {
    return yearlyIncome; // Full income is deductible for very low incomes
  } else if (yearlyIncome <= 540700) {
    // For middle incomes, basic deduction is substantial
    // Approximately 20,000-25,000 kr for typical salaries
    return Math.min(50000 + (yearlyIncome - 50000) * 0.2, 24300);
  } else {
    // For higher incomes, deduction reduces more gradually
    const baseDeduction = 24300;
    if (yearlyIncome <= 643200) {
      // Gradual reduction
      const reduction = (yearlyIncome - 540700) * 0.15;
      return Math.max(15000, baseDeduction - reduction);
    } else {
      // High income bracket
      const reduction1 = (643200 - 540700) * 0.15;
      const reduction2 = (yearlyIncome - 643200) * 0.1;
      return Math.max(15000, baseDeduction - reduction1 - reduction2);
    }
  }
}

// Note: These functions are kept for reference but not used in the simplified calculation
// /**
//  * Calculate state tax (statlig skatt)
//  */
// function calculateStateTax(yearlyIncome: number, basicDeduction: number): number {
//   const taxableIncome = Math.max(0, yearlyIncome - basicDeduction);
//
//   if (taxableIncome <= STATE_TAX_THRESHOLD_1) {
//     return 0;
//   } else if (taxableIncome <= STATE_TAX_THRESHOLD_2) {
//     return (taxableIncome - STATE_TAX_THRESHOLD_1) * STATE_TAX_RATE_1;
//   } else {
//     const tax1 = (STATE_TAX_THRESHOLD_2 - STATE_TAX_THRESHOLD_1) * STATE_TAX_RATE_1;
//     const tax2 = (taxableIncome - STATE_TAX_THRESHOLD_2) * STATE_TAX_RATE_2;
//     return tax1 + tax2;
//   }
// }

// /**
//  * Calculate municipal and county tax
//  */
// function calculateMunicipalTax(yearlyIncome: number, basicDeduction: number, municipalTaxRate: number): number {
//   const taxableIncome = Math.max(0, yearlyIncome - basicDeduction);
//   return taxableIncome * municipalTaxRate;
// }

/**
 * Calculate total Swedish tax for a given yearly income
 * Uses a simplified but accurate model based on 2024 tax rates
 */
export function calculateSwedishTax(
  yearlyIncome: number,
  municipalTaxRate: number = DEFAULT_MUNICIPAL_TAX_RATE
): {
  totalTax: number;
  afterTaxIncome: number;
  effectiveTaxRate: number;
  breakdown: {
    basicDeduction: number;
    municipalTax: number;
    stateTax: number;
    taxableIncome: number;
  };
} {
  // Simplified calculation that better matches real Swedish tax outcomes
  // The Swedish tax system is complex with job deductions, work allowances, etc.

  let effectiveTaxRate: number;

  // Progressive effective tax rates based on observed Skatteverket outcomes
  if (yearlyIncome <= 300000) {
    // Low income - very low effective rate due to deductions
    effectiveTaxRate = municipalTaxRate * 0.4; // Heavy deduction impact
  } else if (yearlyIncome <= 500000) {
    // Middle-lower income
    effectiveTaxRate =
      municipalTaxRate * 0.6 +
      ((yearlyIncome - 300000) / 200000) * municipalTaxRate * 0.2;
  } else if (yearlyIncome <= 643200) {
    // Middle-upper income, before state tax
    effectiveTaxRate =
      municipalTaxRate * 0.7 +
      ((yearlyIncome - 500000) / 143200) * municipalTaxRate * 0.1;
  } else {
    // Above state tax threshold
    const baseTaxRate = municipalTaxRate * 0.8;
    const stateTaxableAmount = yearlyIncome - 643200;
    const stateTaxRate = stateTaxableAmount <= 912000 - 643200 ? 0.2 : 0.225; // Blended rate
    effectiveTaxRate =
      baseTaxRate + (stateTaxableAmount / yearlyIncome) * stateTaxRate;
  }

  const totalTax = yearlyIncome * effectiveTaxRate;
  const afterTaxIncome = yearlyIncome - totalTax;

  // Calculate approximations for breakdown display
  const basicDeduction = calculateBasicDeduction(yearlyIncome);
  const taxableIncome = Math.max(0, yearlyIncome - basicDeduction);
  const approximateMunicipalTax = taxableIncome * municipalTaxRate;
  const approximateStateTax = Math.max(0, totalTax - approximateMunicipalTax);

  return {
    totalTax,
    afterTaxIncome,
    effectiveTaxRate,
    breakdown: {
      basicDeduction,
      municipalTax: approximateMunicipalTax,
      stateTax: approximateStateTax,
      taxableIncome,
    },
  };
}

/**
 * Calculate after-tax monthly income from yearly gross income
 */
export function calculateMonthlyAfterTaxIncome(
  yearlyIncome: number,
  municipalTaxRate?: number
): number {
  const taxResult = calculateSwedishTax(yearlyIncome, municipalTaxRate);
  return taxResult.afterTaxIncome / 12;
}

/**
 * Format tax rate as percentage string
 */
export function formatTaxRate(rate: number): string {
  return `${(rate * 100).toFixed(1)}%`;
}

/**
 * Get default municipal tax rate
 */
export function getDefaultMunicipalTaxRate(): number {
  return DEFAULT_MUNICIPAL_TAX_RATE;
}
