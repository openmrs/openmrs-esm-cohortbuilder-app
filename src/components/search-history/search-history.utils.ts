import { type SearchHistoryItem } from '../../types';
import { getHistoryFromStorage } from '../../session-storage.utils';

/**
 * Retrieves search history from sessionStorage with error handling.
 * @returns Array of search history items, or empty array if data is corrupted/unavailable.
 */
export const getSearchHistory = (): SearchHistoryItem[] => {
  const history = getHistoryFromStorage();
  const searchHistory: SearchHistoryItem[] = [];

  history.forEach((historyItem, index) => {
    if (historyItem?.patients && Array.isArray(historyItem.patients)) {
      searchHistory.push({
        ...historyItem,
        id: (index + 1).toString(),
        results: historyItem.patients.length,
      });
    }
  });

  return searchHistory;
};
