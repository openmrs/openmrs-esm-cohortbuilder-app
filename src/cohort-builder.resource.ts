import { openmrsFetch, FetchResponse } from "@openmrs/esm-framework";

import { Patient, SearchParams } from "./types";

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
