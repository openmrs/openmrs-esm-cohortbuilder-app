import { openmrsFetch } from "@openmrs/esm-framework";
import useSWR from "swr";

import { DropdownValue, Response } from "../../types";

/**
 * @returns PersonAttributes
 */
export function usePersonAttributes() {
  const { data, isValidating, error } = useSWR<{
    data: { results: Response[] };
  }>("/ws/rest/v1/personattributetype", openmrsFetch);

  const personAttributes: DropdownValue[] = [];
  data?.data.results.map((personAttribute: Response, index: number) => {
    personAttributes.push({
      id: index,
      label: personAttribute.display,
      value: personAttribute.uuid,
    });
  });

  return { personAttributes, isValidating, error };
}
