import { openmrsFetch, restBaseUrl, useOpenmrsFetchAll, type FetchResponse } from '@openmrs/esm-framework';
import type { Patient, SearchParams, DropdownValue, Response } from './types';

/**
 * @param searchParams query details
 */

interface SearchResults {
  rows: Patient[];
}

export const search = async (searchParams: SearchParams) => {
  const searchResults: FetchResponse<SearchResults> = await openmrsFetch(
    `${restBaseUrl}/reportingrest/adhocquery?v=full`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: searchParams.query,
    },
  );
  return searchResults;
};

/**
 * @returns Locations
 */
export const useLocations = () => {
  const { data, error, isLoading } = useOpenmrsFetchAll<Response>(`${restBaseUrl}/location`);

  const locations: DropdownValue[] = (data ?? []).map((location, index) => ({
    id: index,
    label: location.display,
    value: location.uuid,
  }));

  return {
    isLoading,
    locations,
    locationsError: error,
  };
};

export const getDataSet = async (queryID: string) => {
  const results: FetchResponse<SearchResults> = await openmrsFetch(`${restBaseUrl}/reportingrest/dataSet/${queryID}`, {
    method: 'GET',
  });

  const dataset = results.data.rows.map((patient: Patient) => {
    patient.id = patient.patientId.toString();
    patient.name = `${patient.firstname} ${patient.lastname}`;

    return patient;
  });

  return dataset;
};

export const getCohortMembers = async (cohortId: string) => {
  const results: FetchResponse<SearchResults> = await openmrsFetch(`${restBaseUrl}/cohort/${cohortId}/member?v=full`, {
    method: 'GET',
  });

  const dataset = results.data.rows.map((patient: Patient) => {
    patient.id = patient.patientId.toString();
    patient.name = `${patient.firstname} ${patient.lastname}`;

    return patient;
  });

  return dataset;
};
