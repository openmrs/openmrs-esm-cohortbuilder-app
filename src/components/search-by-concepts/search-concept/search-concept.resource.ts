import { openmrsFetch } from "@openmrs/esm-framework";

/**
 * @returns Concepts
 * @param conceptName
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
