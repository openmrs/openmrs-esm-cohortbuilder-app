import useSWR from 'swr';
import { type FetchResponse, openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';
import type { DefinitionDataRow, Response } from '../../types';

/** SWR key for the saved queries list, so other components can revalidate it after saving a query. */
export const savedQueriesKey = 'cohort-builder:saved-queries';

export function useQueries() {
  const { data, error, isLoading, mutate } = useSWR<DefinitionDataRow[], Error>(savedQueriesKey, getQueries);

  return {
    queries: data ?? [],
    error,
    isLoading,
    mutate,
  };
}

/**
 * @returns Queries
 */
export async function getQueries(): Promise<DefinitionDataRow[]> {
  const response: FetchResponse<{ results: Response[] }> = await openmrsFetch(
    `${restBaseUrl}/reportingrest/dataSetDefinition?v=full`,
    {
      method: 'GET',
    },
  );

  const queries: DefinitionDataRow[] = [];
  if (response.data.results.length > 0) {
    response.data.results.map((query: Response) => {
      const queryData: DefinitionDataRow = {
        id: query.uuid,
        name: query.name.replace('[AdHocDataExport]', ''),
        description: query.description,
      };
      queries.push(queryData);
    });
  }

  return queries;
}

export const deleteDataSet = async (queryID: string) => {
  const dataset: FetchResponse = await openmrsFetch(`${restBaseUrl}/reportingrest/adhocdataset/${queryID}?purge=true`, {
    method: 'DELETE',
  });
  return dataset;
};
