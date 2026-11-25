export type ThemePreference = 'system' | 'light' | 'dark';

const STORAGE_KEY = 'theme';
const DARK_QUERY = '(prefers-color-scheme: dark)';
const listeners = new Set<() => void>();
let currentPreference: ThemePreference = 'system';

export function parseThemePreference(value: string | null): ThemePreference {
  return value === 'light' || value === 'dark' ? value : 'system';
}

export function resolveTheme(
  preference: ThemePreference,
  isSystemDark: boolean
): 'light' | 'dark' {
  if (preference !== 'system') return preference;

  return isSystemDark ? 'dark' : 'light';
}

function readStoredPreference(): ThemePreference {
  try {
    return parseThemePreference(localStorage.getItem(STORAGE_KEY));
  } catch {
    return 'system';
  }
}

function applyPreference(preference: ThemePreference) {
  currentPreference = preference;
  const theme = resolveTheme(preference, window.matchMedia(DARK_QUERY).matches);
  document.documentElement.dataset.theme = theme;
  document
    .querySelector('meta[name="color-scheme"]')
    ?.setAttribute('content', theme);
  listeners.forEach((listener) => listener());
}

export function initializeTheme() {
  applyPreference(readStoredPreference());
  window
    .matchMedia(DARK_QUERY)
    .addEventListener('change', () => applyPreference(currentPreference));
  window.addEventListener('storage', (event) => {
    // A null key means that another tab cleared all storage
    if (event.key === STORAGE_KEY || event.key === null) {
      applyPreference(readStoredPreference());
    }
  });
}

export function getThemePreference(): ThemePreference {
  return currentPreference;
}

export function setThemePreference(preference: ThemePreference) {
  try {
    localStorage.setItem(STORAGE_KEY, preference);
  } catch (error) {
    console.warn('Failed to store theme:', error);
  }

  applyPreference(preference);
}

export function subscribeToTheme(listener: () => void) {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}
