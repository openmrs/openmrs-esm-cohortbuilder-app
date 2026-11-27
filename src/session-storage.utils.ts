import { showToast } from '@openmrs/esm-framework';

const STORAGE_KEY = 'openmrsHistory';

/**
 * Safely retrieves and parses JSON data from sessionStorage.
 * Returns null if the key doesn't exist, data is corrupted, or storage is inaccessible.
 * Automatically clears corrupted data to prevent repeated failures.
 */
export const safelyGetSessionStorage = <T = unknown>(key: string): T | null => {
  try {
    const data = window.sessionStorage.getItem(key);
    if (!data) {
      return null;
    }
    return JSON.parse(data) as T;
  } catch {
    try {
      window.sessionStorage.removeItem(key);
    } catch {
      // Storage access denied
    }
    return null;
  }
};

/**
 * Safely writes JSON data to sessionStorage with QuotaExceededError handling.
 * Returns true if successful, false otherwise.
 */
export const safelySetSessionStorage = (key: string, value: unknown): boolean => {
  try {
    window.sessionStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    if ((error as DOMException).name === 'QuotaExceededError') {
      showToast({
        title: 'Storage Limit Reached',
        kind: 'warning',
        description: 'Browser storage is full. Some data may not be saved.',
      });
    }
    return false;
  }
};

/**
 * Safely removes a key from sessionStorage.
 */
export const safelyRemoveSessionStorage = (key: string): void => {
  try {
    window.sessionStorage.removeItem(key);
  } catch {
    // Storage access denied
  }
};

/**
 * Retrieves the search history array from sessionStorage.
 * Returns an empty array if data is missing, corrupted, or not an array.
 */
export const getHistoryFromStorage = (): any[] => {
  const data = safelyGetSessionStorage<unknown[]>(STORAGE_KEY);
  return Array.isArray(data) ? data : [];
};

/**
 * Saves a history array to sessionStorage with quota fallback.
 * If storage is full, trims to the 10 most recent entries before retrying.
 */
export const saveHistoryToStorage = (history: unknown[]): boolean => {
  if (safelySetSessionStorage(STORAGE_KEY, history)) {
    return true;
  }

  // Quota exceeded fallback: keep only the last 10 entries
  const reduced = history.slice(-10);
  if (safelySetSessionStorage(STORAGE_KEY, reduced)) {
    showToast({
      title: 'Search History Limit Reached',
      kind: 'warning',
      description: 'Older search history has been cleared to save space.',
    });
    return true;
  }

  // Complete failure
  safelyRemoveSessionStorage(STORAGE_KEY);
  showToast({
    title: 'Search History Unavailable',
    kind: 'error',
    description: 'Unable to save search history. Your searches will still work.',
  });
  return false;
};

export { STORAGE_KEY };
