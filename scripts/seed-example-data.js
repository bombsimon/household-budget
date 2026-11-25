import { encryptionService } from '../src/services/encryptionService.ts';
import { HOUSEHOLDS, PASSWORD, PROJECT_ID } from './example-data.js';

// Always the local emulator, so real households can never be overwritten
const DOCUMENTS_URL = `http://127.0.0.1:8080/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

const toFirestoreValue = (value) => {
  if (Array.isArray(value)) {
    return { arrayValue: { values: value.map(toFirestoreValue) } };
  }

  return typeof value === 'number'
    ? { integerValue: String(value) }
    : { stringValue: value };
};

for (const [householdId, household] of Object.entries(HOUSEHOLDS)) {
  const encrypted = await encryptionService.encryptHouseholdData(
    household,
    PASSWORD
  );
  const fields = Object.fromEntries(
    Object.entries(encrypted).map(([key, value]) => [
      key,
      toFirestoreValue(value),
    ])
  );
  const response = await fetch(`${DOCUMENTS_URL}/households/${householdId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields }),
  });

  if (!response.ok) {
    throw new Error(`Could not seed ${householdId}: ${await response.text()}`);
  }

  console.log(`Seeded ${householdId} with password ${PASSWORD}`);
}
