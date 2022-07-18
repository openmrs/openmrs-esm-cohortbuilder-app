import { FetchResponse, openmrsFetch } from "@openmrs/esm-framework";

import { DropdownValue, Response } from "../../types";

/**
 * @returns PersonAttributes
 */
export async function getPersonAttributes(): Promise<DropdownValue[]> {
  const personAttributesResp: FetchResponse<{
    results: Response[];
  }> = await openmrsFetch("/ws/rest/v1/personattributetype", {
    method: "GET",
  });

  const {
    data: { results },
  } = personAttributesResp;
  const personAttributes: DropdownValue[] = [];
  results.map((personAttribute: Response, index: number) => {
    personAttributes.push({
      id: index,
      label: personAttribute.display,
      value: personAttribute.uuid,
    });
  });

  return personAttributes;
}
