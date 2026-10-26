import { useMemo } from 'react';
import useSWR from 'swr';
import { type FetchResponse, openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';
import type { DefinitionDataRow, Response } from '../../types';

/** SWR key for the saved queries list, so other components can revalidate it after saving a query. */
export const savedQueriesKey = `${restBaseUrl}/reportingrest/dataSetDefinition?v=full`;

export function useQueries() {
  const { data, error, isLoading, mutate } = useSWR<{ data: { results: Array<Response> } }, Error>(
    savedQueriesKey,
    openmrsFetch,
  );

  const mappedQueries: Array<DefinitionDataRow> = useMemo(() => {
    return data?.data?.results?.map((query) => ({
      id: query.uuid,
      name: query.name.replace('[AdHocDataExport]', ''),
      description: query.description,
    }));
  }, [data]);

  return {
    queries: mappedQueries ?? [],
    error,
    isLoading,
    mutate,
  };
}

export const deleteDataSet = async (queryID: string) => {
  const dataset: FetchResponse = await openmrsFetch(`${restBaseUrl}/reportingrest/adhocdataset/${queryID}?purge=true`, {
    method: 'DELETE',
  });
  return dataset;
};
