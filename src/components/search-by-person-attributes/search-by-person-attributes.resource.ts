import { useMemo } from "react";

import { openmrsFetch } from "@openmrs/esm-framework";
import useSWR from "swr";

import { DropdownValue, Response } from "../../types";

/**
 * @returns PersonAttributes
 */
export function usePersonAttributes() {
  const { data, error } = useSWR<{
    data: { results: Response[] };
  }>("/ws/rest/v1/personattributetype", openmrsFetch);

  const results = useMemo(() => {
    const personAttributes: DropdownValue[] = [];
    data?.data.results.map((personAttribute: Response, index: number) => {
      personAttributes.push({
        id: index,
        label: personAttribute.display,
        value: personAttribute.uuid,
      });
    });
    return {
      isLoading: !data && !error,
      personAttributes,
      personAttributesError: error,
    };
  }, [data, error]);

  return results;
}
