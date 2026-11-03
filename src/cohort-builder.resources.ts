import { openmrsFetch, restBaseUrl, useOpenmrsFetchAll, type FetchResponse } from '@openmrs/esm-framework';
import type { Patient, SearchParams, DropdownValue, Response } from './types';
import { isUuid } from './url-definition/url-definition';
import { getPatientName } from './cohort-builder.utils';

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
  const { data, error, isLoading } = useOpenmrsFetchAll<Response>(`${restBaseUrl}/location?v=custom:(uuid,display)`, {
    immutable: true,
    swrInfiniteConfig: { revalidateFirstPage: false },
  });

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
    patient.id = patient.patientId?.toString() ?? '';
    patient.name = getPatientName(patient.firstname, patient.lastname);

    return patient;
  });

  return dataset;
};

interface CohortMembership {
  uuid: string;
  patientUuid: string;
  startDate: string | null;
  endDate: string | null;
  voided: boolean;
}

interface CohortMembershipPage {
  results: CohortMembership[];
  links?: Array<{ rel: string }>;
}

interface CohortMemberDetails {
  patientId: number;
  person: { gender: string; age: number; preferredName: { givenName: string; familyName: string } | null };
  identifiers?: Array<{ identifier: string; preferred: boolean }>;
}

export const MAX_COHORT_MEMBERS_SHOWN = 200;
const MEMBERSHIP_PAGE_SIZE = 100;
const MAX_MEMBERSHIP_PAGES = 1000;
const PATIENT_FETCH_CONCURRENCY = 6;

/** Thrown when a cohort has active members but none of them could be loaded. */
export class CohortMembersLoadError extends Error {
  constructor() {
    super("None of the cohort's members could be loaded");
    this.name = 'CohortMembersLoadError';
  }
}

/**
 * webservices.rest has no cohort members endpoint, only the paged `cohort/{uuid}/membership`
 * subresource, which gives patient uuids. The first MAX_COHORT_MEMBERS_SHOWN active members are
 * then loaded for the results table. `total` counts active members and `unavailable` those of the
 * loaded ones that could not be shown. Throws when there are active members but none could be shown.
 */
export const getCohortMembers = async (
  cohortId: string,
): Promise<{ patients: Patient[]; total: number; unavailable: number }> => {
  if (!isUuid(cohortId)) {
    throw new Error(`Not a cohort uuid: ${cohortId}`);
  }
  const memberships = await getAllMemberships(cohortId);
  const now = new Date();
  const activePatientUuids = memberships
    .filter((membership) => isActiveMembership(membership, now))
    .map((membership) => membership.patientUuid)
    .filter(isUuid);

  const membersToShow = activePatientUuids.slice(0, MAX_COHORT_MEMBERS_SHOWN);
  const patients = (await mapWithConcurrency(membersToShow, PATIENT_FETCH_CONCURRENCY, getCohortMember)).filter(
    Boolean,
  );
  if (membersToShow.length > 0 && patients.length === 0) {
    throw new CohortMembersLoadError();
  }
  return { patients, total: activePatientUuids.length, unavailable: membersToShow.length - patients.length };
};

async function getAllMemberships(cohortId: string) {
  const memberships = new Map<string, CohortMembership>();
  for (let page = 0; page < MAX_MEMBERSHIP_PAGES; page++) {
    const { data }: FetchResponse<CohortMembershipPage> = await openmrsFetch(
      `${restBaseUrl}/cohort/${cohortId}/membership?v=custom:(uuid,patientUuid,startDate,endDate,voided)&limit=${MEMBERSHIP_PAGE_SIZE}&startIndex=${memberships.size}`,
    );
    const sizeBefore = memberships.size;
    data.results.forEach((membership) => memberships.set(membership.uuid, membership));
    const hasNextPage = data.links?.some((link) => link.rel === 'next');
    // Also stops if the server ignores startIndex and keeps returning the same page.
    if (!hasNextPage || memberships.size === sizeBefore) {
      break;
    }
  }
  return [...memberships.values()];
}

/**
 * Same rule as core's CohortMembership.isActive: not voided, started, and not yet ended. Only a missing
 * bound is open; one that is not a date leaves the membership out.
 */
function isActiveMembership({ voided, startDate, endDate }: CohortMembership, now: Date) {
  return (
    !voided &&
    (startDate == null || parseTimestamp(startDate) <= now) &&
    (endDate == null || parseTimestamp(endDate) >= now)
  );
}

/**
 * OpenMRS writes offsets as +0000, which Safari can't parse; the standard +00:00 is the same instant.
 * Anything but a string is an Invalid Date, which no comparison passes.
 */
function parseTimestamp(timestamp: unknown) {
  if (typeof timestamp !== 'string') {
    return new Date(NaN);
  }
  return new Date(timestamp.trim().replace(/([+-]\d{2})(\d{2})$/, '$1:$2'));
}

/** Loads one member for the results table, or null if it cannot be shown. */
async function getCohortMember(patientUuid: string): Promise<Patient | null> {
  try {
    const {
      data: { patientId, person, identifiers },
    }: FetchResponse<CohortMemberDetails> = await openmrsFetch(
      `${restBaseUrl}/patient/${patientUuid}?v=custom:(patientId,person:(gender,age,preferredName:(givenName,familyName)),identifiers:(identifier,preferred))`,
    );
    if (!person?.preferredName) {
      return null;
    }
    const { givenName, familyName } = person.preferredName;
    const identifier = identifiers?.find(({ preferred }) => preferred)?.identifier ?? '';
    return {
      id: patientId.toString(),
      patientId,
      identifier,
      name: getPatientName(givenName, familyName),
      firstname: givenName,
      lastname: familyName,
      age: person.age,
      gender: person.gender,
    };
  } catch {
    return null;
  }
}

async function mapWithConcurrency<T, R>(items: T[], limit: number, mapItem: (item: T) => Promise<R>) {
  const results: R[] = [];
  let nextIndex = 0;
  const worker = async () => {
    while (nextIndex < items.length) {
      const index = nextIndex++;
      results[index] = await mapItem(items[index]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}
