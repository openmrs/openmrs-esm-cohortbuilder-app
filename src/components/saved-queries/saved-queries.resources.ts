import {
  FetchResponse,
  openmrsFetch,
  restBaseUrl,
} from "@openmrs/esm-framework";

import { Response, DefinitionDataRow } from "../../types";

/**
 * @returns Queries
 */
export async function getQueries(): Promise<DefinitionDataRow[]> {
  const response: FetchResponse<{ results: Response[] }> = await openmrsFetch(
    `${restBaseUrl}/reportingrest/dataSetDefinition?v=full`,
    {
      method: "GET",
    }
  );

  let queries: DefinitionDataRow[] = [];
  if (response.data.results.length > 0) {
    response.data.results.map((query: Response) => {
      const queryData: DefinitionDataRow = {
        id: query.uuid,
        name: query.name.replace("[AdHocDataExport]", ""),
        description: query.description,
      };
      queries.push(queryData);
    });
  }

  return queries;
}

export const deleteDataSet = async (queryID: string) => {
  const dataset: FetchResponse = await openmrsFetch(
    `${restBaseUrl}/reportingrest/adhocdataset/${queryID}?purge=true`,
    {
      method: "DELETE",
    }
  );
  return dataset;
};
