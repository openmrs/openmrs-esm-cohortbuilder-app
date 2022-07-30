import { FetchResponse, openmrsFetch } from "@openmrs/esm-framework";

export const deleteCohort = async (cohortId: string) => {
  const response: FetchResponse = await openmrsFetch(
    `/ws/rest/v1/cohort/${cohortId}`,
    {
      method: "DELETE",
    }
  );
  return response;
};
