import type { AppState } from '../types';

const STATE_KEY = 'household-budget-state';
const STATE_VERSION = '1.0.0';

export const saveState = (state: AppState): void => {
  try {
    const stateWithMetadata = {
      ...state,
      version: STATE_VERSION,
      lastUpdated: new Date().toISOString(),
    };

    const serializedState = JSON.stringify(stateWithMetadata);
    localStorage.setItem(STATE_KEY, serializedState);
  } catch (error) {
    console.error('Failed to save state to localStorage:', error);
  }
};

export const loadState = (): AppState | null => {
  try {
    const serializedState = localStorage.getItem(STATE_KEY);
    if (!serializedState) {
      return null;
    }

    const state = JSON.parse(serializedState) as AppState;

    // Version check - in the future we can handle migrations here
    if (!state.version || state.version !== STATE_VERSION) {
      console.warn(
        `State version mismatch. Expected ${STATE_VERSION}, got ${state.version}`
      );
      // For now, we'll still load it, but this is where we'd handle migrations
    }

    return state;
  } catch (error) {
    console.error('Failed to load state from localStorage:', error);
    return null;
  }
};

export const exportState = (state: AppState): void => {
  try {
    const stateWithMetadata = {
      ...state,
      version: STATE_VERSION,
      lastUpdated: new Date().toISOString(),
    };

    const dataStr = JSON.stringify(stateWithMetadata, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });

    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `household-budget-${new Date().toISOString().split('T')[0]}.json`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Failed to export state:', error);
    throw new Error('Failed to export data. Please try again.');
  }
};

export const importState = (file: File): Promise<AppState> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const result = event.target?.result;
        if (typeof result !== 'string') {
          throw new Error('Invalid file content');
        }

        const state = JSON.parse(result) as AppState;

        // Validate required fields
        if (
          !state.users ||
          !state.categories ||
          !state.personalCategories ||
          !state.loans ||
          !state.assets
        ) {
          throw new Error('Invalid state format - missing required fields');
        }

        // Version check
        if (state.version && state.version !== STATE_VERSION) {
          console.warn(
            `Importing state with different version. Expected ${STATE_VERSION}, got ${state.version}`
          );
        }

        resolve(state);
      } catch (error) {
        reject(
          new Error(
            "Failed to parse JSON file. Please ensure it's a valid budget export."
          )
        );
      }
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsText(file);
  });
};

export const clearState = (): void => {
  try {
    localStorage.removeItem(STATE_KEY);
  } catch (error) {
    console.error('Failed to clear state:', error);
  }
};
