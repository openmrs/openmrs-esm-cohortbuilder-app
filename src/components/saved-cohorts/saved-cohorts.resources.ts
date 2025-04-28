import { useMemo } from 'react';
import useSWR from 'swr';
import { type FetchResponse, openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';
import type { Cohort, DefinitionDataRow } from '../../types';

export function useCohorts() {
  const url = `${restBaseUrl}/cohort?v=full`;

  const { data, isLoading, isValidating } = useSWR<{ data: { results: Array<Cohort> } }, Error>(url, openmrsFetch);

  const mappedCohorts: Array<DefinitionDataRow> = useMemo(() => {
    return data?.data?.results?.map((cohort) => ({
      id: cohort.uuid,
      name: cohort.name,
      description: cohort.description,
    }));
  }, [data]);

  return {
    cohorts: mappedCohorts ?? [],
    isLoading,
    isValidating,
  };
}

export const onDeleteCohort = async (cohort: string) => {
  const result: FetchResponse = await openmrsFetch(`${restBaseUrl}/cohort/${cohort}`, {
    method: 'DELETE',
  });
  return result;
};
