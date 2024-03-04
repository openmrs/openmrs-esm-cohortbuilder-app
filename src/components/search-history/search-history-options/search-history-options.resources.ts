import {
  FetchResponse,
  openmrsFetch,
  restBaseUrl,
} from "@openmrs/esm-framework";

import { Cohort, Query } from "../../../types";

/**
 * @returns Cohort
 * @param cohort
 */
export async function createCohort(
  cohort: Cohort
): Promise<FetchResponse<Cohort>> {
  return await openmrsFetch(`${restBaseUrl}/cohort`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: cohort,
  });
}

/**
 * @returns Query
 * @param query
 */
export async function createQuery(query: Query): Promise<FetchResponse<Query>> {
  return await openmrsFetch(`${restBaseUrl}/reportingrest/adhocdataset`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: query,
  });
}
