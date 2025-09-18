import {
  parseTaxTableCSV,
  findTaxFromTable,
  type TaxTableRow,
} from '../utils/csvParser';

let cachedTaxTableData: TaxTableRow[] | null = null;
let loadingPromise: Promise<TaxTableRow[]> | null = null;

export async function loadTaxTableData(): Promise<TaxTableRow[]> {
  if (cachedTaxTableData) {
    return cachedTaxTableData;
  }

  if (loadingPromise) {
    return loadingPromise;
  }

  loadingPromise = (async () => {
    try {
      // Use the correct base path for GitHub Pages
      const basePath = import.meta.env.BASE_URL || '/';
      const csvPath = `${basePath}tax_table.csv`.replace('//', '/');
      const response = await fetch(csvPath);
      if (!response.ok) {
        throw new Error(`Failed to load tax table: ${response.statusText}`);
      }

      const csvContent = await response.text();
      const taxTableData = parseTaxTableCSV(csvContent);

      cachedTaxTableData = taxTableData;
      loadingPromise = null;

      return taxTableData;
    } catch (error) {
      loadingPromise = null;
      throw error;
    }
  })();

  return loadingPromise;
}

export function getTaxFromTablesSync(
  yearlyIncome: number,
  tableNumber: number
): number | null {
  if (!cachedTaxTableData) {
    return null;
  }

  try {
    const result = findTaxFromTable(
      cachedTaxTableData,
      yearlyIncome,
      tableNumber
    );
    return result;
  } catch (error) {
    return null;
  }
}

export function preloadTaxTableData(): Promise<TaxTableRow[]> {
  return loadTaxTableData();
}
