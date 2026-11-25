import { useSyncExternalStore } from 'react';
import {
  getTaxTableStatus,
  subscribeToTaxTable,
} from '../services/taxTableService';

export function useTaxTableStatus() {
  return useSyncExternalStore(subscribeToTaxTable, getTaxTableStatus);
}
