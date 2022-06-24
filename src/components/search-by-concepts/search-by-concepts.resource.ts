import { openmrsFetch, getGlobalStore } from "@openmrs/esm-framework";

import { addToHistory } from "./helpers";

const patientsStore = getGlobalStore("patients");
const notificationStore = getGlobalStore("notification");

/**
 * @param queryDetails query details
 * @param description query description
 */
export const search = async (queryDetails, description: string) => {
  await openmrsFetch("/ws/rest/v1/reportingrest/adhocquery?v=full", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: queryDetails.query,
  })
    .then((response) => {
      const { data } = response;
      if (data.error) {
        notificationStore.setState({
          notification: { kind: "error", title: data.error },
        });
      } else {
        data.searchDescription = description || queryDetails.label;
        data.query = queryDetails.query;
        patientsStore.setState({ patients: data.rows });
        notificationStore.setState({
          notification: {
            kind: "success",
            title: `Search completed with ${data.rows.length} result(s)`,
          },
        });
        addToHistory(description, data.rows, queryDetails.query);
      }
    })
    .catch((error) =>
      notificationStore.setState({
        notification: { kind: "error", title: error },
      })
    );
};
