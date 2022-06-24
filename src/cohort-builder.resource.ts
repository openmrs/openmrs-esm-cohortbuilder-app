import { openmrsFetch } from "@openmrs/esm-framework";

/**
 * @param queryDetails query details
 */
export const search = async (queryDetails) => {
  return await openmrsFetch("/ws/rest/v1/reportingrest/adhocquery?v=full", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: queryDetails.query,
  });
};
