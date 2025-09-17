export interface TaxTableRow {
  year: string;
  antalDgr: string;
  tabellnr: number;
  inkomstFrom: number;
  inkomstTo: number;
  kolumn1: number;
  kolumn2: number;
  kolumn3: number;
  kolumn4: number;
  kolumn5: number;
  kolumn6: number;
  kolumn7: number;
}

export function parseTaxTableCSV(csvContent: string): TaxTableRow[] {
  const lines = csvContent.trim().split('\n');

  // Skip header and parse data rows
  const rows: TaxTableRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const columns = line.split(';');

    if (columns.length >= 12) {
      const row: TaxTableRow = {
        year: columns[0],
        antalDgr: columns[1],
        tabellnr: parseInt(columns[2], 10),
        inkomstFrom: parseInt(columns[3], 10),
        inkomstTo:
          columns[4] === ''
            ? Number.MAX_SAFE_INTEGER
            : parseInt(columns[4], 10),
        kolumn1: parseInt(columns[5], 10) || 0,
        kolumn2: parseInt(columns[6], 10) || 0,
        kolumn3: parseInt(columns[7], 10) || 0,
        kolumn4: parseInt(columns[8], 10) || 0,
        kolumn5: parseInt(columns[9], 10) || 0,
        kolumn6: parseInt(columns[10], 10) || 0,
        kolumn7: parseInt(columns[11], 10) || 0,
      };

      if (!isNaN(row.tabellnr) && !isNaN(row.inkomstFrom)) {
        rows.push(row);
      }
    }
  }

  return rows;
}

export function findTaxFromTable(
  taxTableRows: TaxTableRow[],
  yearlyIncome: number,
  tableNumber: number
): number {
  const matchingRow = taxTableRows.find(
    (row) =>
      row.tabellnr === tableNumber &&
      row.year === '2025' &&
      (row.antalDgr === '30%' || row.antalDgr === '30B') &&
      yearlyIncome >= row.inkomstFrom &&
      yearlyIncome <= row.inkomstTo
  );

  if (!matchingRow) {
    throw new Error(
      `No tax data found for income ${yearlyIncome} kr in table ${tableNumber}`
    );
  }

  const columns = [
    matchingRow.kolumn1,
    matchingRow.kolumn2,
    matchingRow.kolumn3,
    matchingRow.kolumn4,
    matchingRow.kolumn5,
    matchingRow.kolumn6,
    matchingRow.kolumn7,
  ];

  for (const taxAmount of columns) {
    if (taxAmount > 0) {
      return taxAmount;
    }
  }

  return 0;
}
