import { useSyncExternalStore } from 'react';
import { getThemePreference, subscribeToTheme } from '../utils/theme';

export function useThemePreference() {
  return useSyncExternalStore(subscribeToTheme, getThemePreference);
}
