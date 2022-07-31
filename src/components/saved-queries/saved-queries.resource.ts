import { FetchResponse, openmrsFetch } from "@openmrs/esm-framework";

import { Response } from "../../types";

/**
 * @returns Queries
 * @param queryName
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
      const queryData: Response = { ...query, id: (index + 1).toString() };
      return queryData;
    });
  }

  return queries;
}

export const deleteDataSet = async (queryID: string) => {
  const dataset: FetchResponse = await openmrsFetch(
    `/ws/rest/v1/reportingrest/adhocdataset/${queryID}?purge=true`,
    {
      method: "DELETE",
    }
  );
  return dataset;
};
