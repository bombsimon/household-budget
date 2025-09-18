/**
 * Swedish Tax Service
 * Municipality data and tax calculations using official Swedish tax tables
 */

import { STATIC_MUNICIPALITIES } from '../data/municipalities';
import { getTaxFromTablesSync, preloadTaxTableData } from './taxTableService';

export interface Municipality {
  kod: string;
  namn: string;
}

export interface TaxRates {
  kommunalskatt: number;
  regionskatt?: number;
  begravningsavgift: number;
  lan?: {
    regionskatt: number;
  };
}

export function fetchMunicipalities(): Municipality[] {
  return STATIC_MUNICIPALITIES.map((m) => ({
    kod: m.kod.toString(),
    namn: m.namn,
  }));
}

export function fetchMunicipalityTaxRates(municipalityCode: string): TaxRates {
  // Find municipality in static data
  const staticMunicipality = STATIC_MUNICIPALITIES.find(
    (m) => m.kod.toString() === municipalityCode
  );

  if (!staticMunicipality) {
    throw new Error(`Municipality ${municipalityCode} not found in data`);
  }

  const taxRates: TaxRates = {
    kommunalskatt: staticMunicipality.kommunalskatt,
    begravningsavgift: staticMunicipality.begravningsavgift,
  };

  if (staticMunicipality.regionskatt !== undefined) {
    taxRates.regionskatt = staticMunicipality.regionskatt;
  }

  return taxRates;
}

export function guessTaxTable(
  kommunalskatt: number,
  regionskatt: number = 0,
  begravningsavgift: number
): number {
  const total = kommunalskatt + regionskatt + begravningsavgift;
  return Math.round(total);
}

export function calculateAfterTaxIncomeWithTablesSync(
  yearlyIncome: number,
  municipalityCode: string
): {
  afterTaxIncome: number;
  monthlyAfterTax: number;
  totalTax: number;
  effectiveTaxRate: number;
  taxRates: TaxRates;
  tableNumber: number;
  usedTaxTables: boolean;
} {
  // Get tax rates for the municipality
  const taxRates = fetchMunicipalityTaxRates(municipalityCode);

  // Guess the tax table number
  const tableNumber = guessTaxTable(
    taxRates.kommunalskatt,
    taxRates.regionskatt || 0,
    taxRates.begravningsavgift
  );

  // Convert yearly income to monthly for tax table lookup
  const monthlyIncome = Math.round(yearlyIncome / 12);

  // Try to get monthly tax from cached table data
  const monthlyTaxFromTables = getTaxFromTablesSync(monthlyIncome, tableNumber);

  if (monthlyTaxFromTables !== null) {
    // Convert back to yearly tax
    const totalTax = monthlyTaxFromTables * 12;
    const afterTaxIncome = yearlyIncome - totalTax;
    const monthlyAfterTax = afterTaxIncome / 12;
    const effectiveTaxRate = totalTax / yearlyIncome;

    return {
      afterTaxIncome,
      monthlyAfterTax,
      totalTax,
      effectiveTaxRate,
      taxRates,
      tableNumber,
      usedTaxTables: true,
    };
  } else {
    return {
      afterTaxIncome: yearlyIncome * 0.7,
      monthlyAfterTax: (yearlyIncome * 0.7) / 12,
      totalTax: yearlyIncome * 0.3,
      effectiveTaxRate: 0.3,
      taxRates,
      tableNumber,
      usedTaxTables: false,
    };
  }
}

export function initializeTaxService(): Promise<void> {
  return preloadTaxTableData()
    .then(() => {})
    .catch(() => {});
}
