import { FetchResponse, openmrsFetch } from "@openmrs/esm-framework";

import { Cohort } from "../../types/types";

/**
 * @returns Concepts
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

  return savedCohort.data;
}
