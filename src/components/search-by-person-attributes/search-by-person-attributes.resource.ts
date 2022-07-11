import { FetchResponse, openmrsFetch } from "@openmrs/esm-framework";

import { PersonAttribute } from "../../types";

interface PersonAttributeResponse {
  uuid: string;
  display: string;
}

/**
 * @returns PersonAttributes
 */
export async function getPersonAttributes(): Promise<PersonAttribute[]> {
  const personAttributesResp: FetchResponse<{
    results: PersonAttributeResponse[];
  }> = await openmrsFetch("/ws/rest/v1/personattributetype", {
    method: "GET",
  });

  const {
    data: { results },
  } = personAttributesResp;
  const personAttributes: PersonAttribute[] = [];
  results.map((personAttribute: PersonAttributeResponse, index: number) => {
    personAttributes.push({
      id: index,
      label: personAttribute.display,
      value: personAttribute.uuid,
    });
  });

  return personAttributes;
}
