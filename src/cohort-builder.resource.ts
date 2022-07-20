import { openmrsFetch, FetchResponse } from "@openmrs/esm-framework";
import useSWRImmutable from "swr/immutable";

import { Patient, SearchParams, DropdownValue, Response } from "./types";

/**
 * @param searchParams query details
 */

interface SearchResults {
  rows: Patient[];
}

export const search = async (searchParams: SearchParams) => {
  const searchResults: FetchResponse<SearchResults> = await openmrsFetch(
    "/ws/rest/v1/reportingrest/adhocquery?v=full",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: searchParams.query,
    }
  );
  return searchResults;
};

/**
 * @returns Locations
 */
export const useLocations = () => {
  const { data, error } = useSWRImmutable<{
    data: { results: Response[] };
  }>("/ws/rest/v1/location", openmrsFetch);

  const locations: DropdownValue[] = [];
  data?.data.results.map((location: Response, index: number) => {
    locations.push({
      id: index,
      label: location.display,
      value: location.uuid,
    });
  });

  return {
    isLoading: !data && !error,
    locations,
    locationsError: error,
  };
};
