import { composeJson } from "../../cohort-builder.utils";
import { DropdownValue } from "../../types";

export const getQueryDetails = (
  method: string,
  selectedLocations: DropdownValue[]
) => {
  const locations = [];
  selectedLocations?.map((location) => locations.push(location.value));
  const searchParameter = {
    encounterSearchAdvanced: [
      { name: "locationList", value: locations },
      { name: "timeQualifier", value: method },
    ],
  };
  const queryDetails = composeJson(searchParameter);

  return queryDetails;
};

export const getDescription = (
  method: string,
  selectedLocations: DropdownValue[]
) => {
  let description = `Patients in ${selectedLocations
    ?.map((location) => location.label)
    .join(", ")}`;
  switch (method) {
    case "FIRST":
      description += " (by method EARLIEST_ENCOUNTER).";
      break;
    case "LAST":
      description += " (by method LATEST_ENCOUNTER).";
      break;
    default:
      description += " (by method ANY_ENCOUNTER).";
      break;
  }
  return description;
};
