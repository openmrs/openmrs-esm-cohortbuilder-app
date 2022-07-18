import { composeJson } from "../../cohort-builder.utils";
import { EncounterDetails } from "../../types";

export const getDescription = ({
  selectedEncounterTypes,
  encounterLocation,
  encounterForm,
  atLeastCount,
  atMostCount,
  onOrAfter,
  onOrBefore,
}: EncounterDetails) => {
  let description = "Patients with Encounter of";
  const selectedEncounters = selectedEncounterTypes
    .map((encounter) => encounter.label)
    .join(", ")
    .replace(/,(?=[^,]*$)/, " and ");

  description += selectedEncounters
    ? ` Type${selectedEncounters.length > 1 ? "s" : ""} ${selectedEncounters}`
    : " any Type";
  if (encounterLocation) {
    description += ` at ${encounterLocation.label}`;
  }
  if (encounterForm) {
    description += ` from ${encounterForm.label}`;
  }
  if (atLeastCount) {
    description += ` at least ${atLeastCount} ${
      atLeastCount > 1 ? "times" : "time"
    }`;
  }
  if (atMostCount) {
    description += ` ${atLeastCount ? " and" : ""} at most ${atMostCount} ${
      atMostCount > 1 ? "times" : "time"
    }`;
  }
  if (onOrAfter) {
    if (onOrBefore) {
      description += ` from ${onOrAfter}`;
    } else {
      description += ` on or after ${onOrAfter}`;
    }
  }
  if (onOrBefore) {
    if (onOrAfter) {
      description += ` to ${onOrBefore}`;
    } else {
      description += ` on or before ${onOrBefore}`;
    }
  }
  return description;
};

export const getQueryDetails = ({
  onOrAfter,
  atLeastCount,
  atMostCount,
  encounterForm,
  encounterLocation,
  onOrBefore,
  selectedEncounterTypes,
}: EncounterDetails) => {
  const searchParams = { encounterSearchAdvanced: [] };
  if (onOrAfter) {
    searchParams.encounterSearchAdvanced.push({
      name: "onOrAfter",
      value: onOrAfter,
    });
  }
  if (atLeastCount) {
    searchParams.encounterSearchAdvanced.push({
      name: "atLeastCount",
      value: atLeastCount,
    });
  }
  if (atMostCount) {
    searchParams.encounterSearchAdvanced.push({
      name: "atMostCount",
      value: atMostCount,
    });
  }
  if (encounterForm) {
    searchParams.encounterSearchAdvanced.push({
      name: "formList",
      value: [encounterForm.value],
    });
  }
  if (encounterLocation) {
    searchParams.encounterSearchAdvanced.push({
      name: "locationList",
      value: [encounterLocation.value],
    });
  }
  if (onOrBefore) {
    searchParams.encounterSearchAdvanced.push({
      name: "onOrBefore",
      value: onOrBefore,
    });
  }
  if (selectedEncounterTypes.length > 0) {
    searchParams.encounterSearchAdvanced.push({
      name: "encounterTypeList",
      value: selectedEncounterTypes.map((encounter) => encounter.value),
    });
  }

  return composeJson(searchParams);
};
