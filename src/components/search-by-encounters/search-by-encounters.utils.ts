import { composeJson } from "../../cohort-builder.utils";
import { EncounterDetails } from "../../types";

export const getDescription = ({
  selectedEncounterTypes,
  encounterLocations,
  encounterForms,
  atLeastCount,
  atMostCount,
  onOrAfter,
  onOrBefore,
}: EncounterDetails) => {
  let description = "Patients with Encounter of";
  const selectedEncounters = selectedEncounterTypes
    .map((encounterType) => encounterType.label)
    .join(", ")
    .replace(/,(?=[^,]*$)/, " and ");

  description += selectedEncounters
    ? ` Type${selectedEncounters.length > 1 ? "s" : ""} ${selectedEncounters}`
    : " any Type";
  if (encounterLocations.length) {
    description += ` at ${encounterLocations
      .map((location) => location.label)
      .join(", ")}`;
  }
  if (encounterForms.length) {
    description += ` from ${encounterForms
      .map((form) => form.label)
      .join(", ")}`;
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
  encounterForms,
  encounterLocations,
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
  if (encounterForms.length) {
    searchParams.encounterSearchAdvanced.push({
      name: "formList",
      value: encounterForms.map((form) => form.value),
    });
  }
  if (encounterLocations.length) {
    searchParams.encounterSearchAdvanced.push({
      name: "locationList",
      value: encounterLocations.map((location) => location.value),
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
      value: selectedEncounterTypes.map((encounterType) => encounterType.value),
    });
  }

  return composeJson(searchParams);
};
