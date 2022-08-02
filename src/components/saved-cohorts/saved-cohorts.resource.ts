import { FetchResponse, openmrsFetch } from "@openmrs/esm-framework";

import { Cohort, DefinitionDataRow } from "../../types";

/**
 * @returns Cohorts
 */
export async function getCohorts(): Promise<DefinitionDataRow[]> {
  const response: FetchResponse<{ results: Cohort[] }> = await openmrsFetch(
    "/ws/rest/v1/cohort?v=full",
    {
      method: "GET",
    }
  );

  let cohorts: DefinitionDataRow[] = [];
  if (response.data.results.length > 0) {
    response.data.results.map((cohort: Cohort) => {
      const cohortData: DefinitionDataRow = {
        id: cohort.uuid,
        name: cohort.name,
        description: cohort.description,
      };
      cohorts.push(cohortData);
    });
  }

  return cohorts;
}

export const onDeleteCohort = async (cohort: string) => {
  const result: FetchResponse = await openmrsFetch(
    `/ws/rest/v1/cohort/${cohort}`,
    {
      method: "DELETE",
    }
  );
  return result;
};
