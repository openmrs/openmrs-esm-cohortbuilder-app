export const getSearchHistory = () => {
  const history = JSON.parse(window.sessionStorage.getItem("openmrsHistory"));
  let searchHistory = [];
  history?.map((historyItem, index) =>
    searchHistory.push({
      id: index + 1,
      description: historyItem.description,
      results: historyItem.patients.length,
      parameters: historyItem.parameters,
    })
  );
  return searchHistory;
};
