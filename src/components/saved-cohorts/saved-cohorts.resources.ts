import { useMemo } from 'react';
import useSWR from 'swr';
import { type FetchResponse, openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';
import type { Cohort, DefinitionDataRow } from '../../types';

/** SWR key for the saved cohorts list, so other components can revalidate it after saving a cohort. */
export const savedCohortsKey = `${restBaseUrl}/cohort?v=full`;

export function useCohorts() {
  const { data, error, isLoading, isValidating, mutate } = useSWR<{ data: { results: Array<Cohort> } }, Error>(
    savedCohortsKey,
    openmrsFetch,
  );

  const mappedCohorts: Array<DefinitionDataRow> = useMemo(() => {
    return data?.data?.results?.map((cohort) => ({
      id: cohort.uuid,
      name: cohort.name,
      description: cohort.description,
    }));
  }, [data]);

  return {
    cohorts: mappedCohorts ?? [],
    error,
    isLoading,
    isValidating,
    mutate,
  };
}

export const onDeleteCohort = async (cohort: string) => {
  const result: FetchResponse = await openmrsFetch(`${restBaseUrl}/cohort/${cohort}`, {
    method: 'DELETE',
  });
  return result;
};
