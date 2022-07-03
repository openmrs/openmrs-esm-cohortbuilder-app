import { FetchResponse, openmrsFetch } from "@openmrs/esm-framework";

import { Cohort, Query } from "../../types/types";

/**
 * @returns Cohort
 * @param cohort
 */
export async function createCohort(cohort: Cohort) {
  const savedCohort: FetchResponse<Cohort> = await openmrsFetch(
    "/ws/rest/v1/cohort",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: cohort,
    }
  );

  return savedCohort;
}

/**
 * @returns Query
 * @param query
 */
export async function createQuery(query: Query) {
  return await openmrsFetch("/ws/rest/v1/reportingrest/adhocdataset", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: query,
  });
}
