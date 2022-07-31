import { FetchResponse, openmrsFetch } from "@openmrs/esm-framework";

import { Cohort } from "../../types";

/**
 * @returns Cohorts
 * @param cohortName
 */
export async function getCohorts(cohortName: String): Promise<Cohort[]> {
  const searchResults: FetchResponse<{ results: Cohort[] }> =
    await openmrsFetch(`/ws/rest/v1/cohort?v=full&q=${cohortName}`, {
      method: "GET",
    });

  let cohorts: Cohort[] = [];
  if (searchResults.data.results.length > 0) {
    cohorts = searchResults.data.results.map((cohort, index) => {
      const cohortData: Cohort = { ...cohort, id: (index + 1).toString() };
      return cohortData;
    });
  }

  return cohorts;
}

export const deleteCohort = async (cohort: string) => {
  const result: FetchResponse = await openmrsFetch(
    `/ws/rest/v1/cohort/${cohort}`,
    {
      method: "DELETE",
    }
  );
  return result;
};
