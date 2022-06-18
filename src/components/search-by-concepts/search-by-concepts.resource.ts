import { openmrsFetch } from "@openmrs/esm-framework";

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

  let allConcepts = [];
  if (searchResult.data.results.length > 0) {
    allConcepts = searchResult.data.results.map((concept) => {
      const description = concept.descriptions.filter((des) =>
        des.locale == "en" ? des.description : ""
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

  return allConcepts;
}

const addToHistory = (description, patients, parameters) => {
  // console.log(description, patients, parameters);
};

export const search = (queryDetails, description = "") => {
  openmrsFetch("/ws/rest/v1/reportingrest/adhocquery?v=full", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: queryDetails.query,
  }).then((response) => {
    response
      .json()
      .then((data) => {
        if (data.error) {
          return data.error;
        } else {
          data.searchDescription = description || queryDetails.label;
          data.query = queryDetails.query;
        }
        if (JSON.stringify(data.rows) === JSON.stringify([])) {
          addToHistory(description, data.rows, queryDetails.query);
        }
        return data;
      })
      .catch((error) => error);
  });
};
