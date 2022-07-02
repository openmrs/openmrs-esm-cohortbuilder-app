import { Patient, SearchHistoryItem } from "../../types/types";

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

const convertToCSV = (patients: Patient[]) => {
  const csv =
    "patient_id, full_name, age, gender\n" +
    patients
      .map((patient) => {
        const orderedPatient = {
          patientId: patient.patientId,
          name: patient.name,
          age: patient.age,
          gender: patient.gender,
        };

        return Object.keys(orderedPatient)
          .map((key) => {
            return `"${patient[key]}"`;
          })
          .join(",");
      })
      .join("\n");

  return csv;
};

export const downloadCSV = (data, filename) => {
  const blob = new Blob([convertToCSV(data)], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);

  const pom = document.createElement("a");
  pom.href = url;
  pom.setAttribute("download", filename);
  pom.click();
};
