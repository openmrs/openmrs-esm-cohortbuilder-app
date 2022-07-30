import { FetchResponse, openmrsFetch } from "@openmrs/esm-framework";

export const deleteDataSet = async (queryID: string) => {
  const dataset: FetchResponse = await openmrsFetch(
    `/ws/rest/v1/reportingrest/adhocdataset/${queryID}?purge=true`,
    {
      method: "DELETE",
    }
  );
  return dataset;
};
