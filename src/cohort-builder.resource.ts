import { openmrsFetch, FetchResponse } from "@openmrs/esm-framework";

import { Patient, SearchParams, Location, LocationResponse } from "./types";

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
export const fetchLocations = async () => {
  const locationsResp: FetchResponse<{
    results: LocationResponse[];
  }> = await openmrsFetch("/ws/rest/v1/location", {
    method: "GET",
  });

  const {
    data: { results },
  } = locationsResp;
  const locations: Location[] = [];
  results.map((location: LocationResponse, index: number) => {
    locations.push({
      id: index,
      label: location.display,
      value: location.uuid,
    });
  });

  return locations;
};
