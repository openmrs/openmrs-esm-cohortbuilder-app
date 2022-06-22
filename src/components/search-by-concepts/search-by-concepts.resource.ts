import { openmrsFetch, getGlobalStore } from "@openmrs/esm-framework";

const patientsStore = getGlobalStore("patients");
const notificationStore = getGlobalStore("notification");

/**
 * @param query conceptName
 * @returns Concepts
 */
export async function getConcepts(conceptName: String) {
  const searchResult = await openmrsFetch(
    `/ws/rest/v1/concept?v=full&q=${conceptName}`,
    {
      method: "GET",
    }
  );

  let concepts = [];
  if (searchResult.data.results.length > 0) {
    concepts = searchResult.data.results.map((concept) => {
      const description = concept.descriptions.filter(
        (description: { locale: string; description: string }) =>
          description.locale == "en" ? description.description : ""
      );
      const conceptData = {
        uuid: concept.uuid,
        units: concept.units || "",
        answers: concept.answers,
        hl7Abbrev: concept.datatype.hl7Abbreviation,
        name: concept.name.name,
        description:
          description.length > 0
            ? description[0].description
            : "no description available",
        datatype: concept.datatype,
      };
      return conceptData;
    });
  }

  return concepts;
}

const addToHistory = (
  description: string,
  patients: fhir.Patient[],
  parameters: []
) => {
  const newHistory = [{ description, patients, parameters }];
  window.sessionStorage.setItem("openmrsHistory", JSON.stringify(newHistory));
};

/**
 * @param queryDetails query details
 * @param description query description
 */
export const search = async (queryDetails, description: string) => {
  await openmrsFetch("/ws/rest/v1/reportingrest/adhocquery?v=full", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: queryDetails.query,
  })
    .then((response) => {
      const { data } = response;
      if (data.error) {
        notificationStore.setState({
          notification: { kind: "error", title: data.error },
        });
      } else {
        data.searchDescription = description || queryDetails.label;
        data.query = queryDetails.query;
        patientsStore.setState({ patients: data.rows });
        notificationStore.setState({
          notification: {
            kind: "success",
            title: `Search completed with ${data.rows.length} result(s)`,
          },
        });
        addToHistory(description, data.rows, queryDetails.query);
      }
    })
    .catch((error) =>
      notificationStore.setState({
        notification: { kind: "error", title: error },
      })
    );
};
