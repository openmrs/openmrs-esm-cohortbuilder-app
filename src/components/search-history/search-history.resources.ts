import { openmrsFetch } from "@openmrs/esm-framework";

export interface Cohort {
  display: string;
  name: string;
  description: string;
  memberIds: number[];
}

/**
 * @returns Concepts
 * @param cohort
 */
export async function createCohort(cohort: Cohort) {
  const searchResult = await openmrsFetch("/ws/rest/v1/cohort", {
    method: "POST",
    body: cohort,
  });

  return searchResult;
}

/**
 * @returns Concepts
 * @param cohortId
 */
export async function deleteCohort(cohortId: string) {
  const searchResult = await openmrsFetch(`/ws/rest/v1/cohort/${cohortId}`, {
    method: "DELETE",
  });

  return searchResult;
}
