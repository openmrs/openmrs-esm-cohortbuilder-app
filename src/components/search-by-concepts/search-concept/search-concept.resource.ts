import { type FetchResponse, openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';
import type { Concept, DataType } from '../../../types';

interface ConceptResponse {
  uuid: string;
  descriptions: Description[];
  units: string;
  answers: string[];
  datatype: DataType;
  name: { name: string };
}

interface Description {
  locale: string;
  description: string;
}

/**
 * @returns Concepts
 * @param conceptName
 */
export async function getConcepts(conceptName: String): Promise<Concept[]> {
  const searchResult: FetchResponse<{ results: ConceptResponse[] }> = await openmrsFetch(
    `${restBaseUrl}/concept?v=full&q=${conceptName}`,
    {
      method: 'GET',
    },
  );

  let concepts: Concept[] = [];
  if (searchResult.data.results.length > 0) {
    concepts = searchResult.data.results.map((concept) => {
      const description = concept.descriptions.filter((description: Description) =>
        description.locale == 'en' ? description.description : '',
      );
      const conceptData: Concept = {
        uuid: concept.uuid,
        units: concept.units || '',
        answers: concept.answers,
        hl7Abbrev: concept.datatype.hl7Abbreviation,
        name: concept.name.name,
        description: description.length > 0 ? description[0].description : 'no description available',
        datatype: concept.datatype,
      };
      return conceptData;
    });
  }

  return concepts;
}
