import { SearchHistoryItem } from "../../types";

export const getSearchHistory = () => {
  const history = JSON.parse(window.sessionStorage.getItem("openmrsHistory"));
  let searchHistory: SearchHistoryItem[] = [];
  history?.map((historyItem, index) =>
    searchHistory.push({
      ...historyItem,
      id: (index + 1).toString(),
      results: historyItem.patients.length,
    })
  );
  return searchHistory;
};
