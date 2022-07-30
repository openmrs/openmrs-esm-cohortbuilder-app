import { FetchResponse, openmrsFetch } from "@openmrs/esm-framework";

import { Response } from "../../types";

/**
 * @returns Cohorts
 * @param cohortName
 */
export async function getQueries(queryName: String): Promise<Response[]> {
  const searchResults: FetchResponse<{ results: Response[] }> =
    await openmrsFetch(
      `/ws/rest/v1/reportingrest/dataSetDefinition?v=full&q=${queryName}`,
      {
        method: "GET",
      }
    );

  let queries: Response[] = [];
  if (searchResults.data.results.length > 0) {
    queries = searchResults.data.results.map((query, index) => {
      const queryData: Response = { ...query, id: index.toString() + 1 };
      return queryData;
    });
  }

  return queries;
}
