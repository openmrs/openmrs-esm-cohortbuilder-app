import { formatDate } from "@openmrs/esm-framework";

import { composeJson } from "../../cohort-builder.utils";
import { DrugOrderDetails } from "./../../types/index";

export const getDescription = ({
  selectedDrugs,
  selectedCareSetting,
  activeOnOrBefore,
  activeOnOrAfter,
  activatedOnOrBefore,
  activatedOnOrAfter,
}: DrugOrderDetails) => {
  let description =
    "Patients who taking " +
    selectedDrugs
      .map((drug) => drug.label)
      .join(", ")
      .replace(/,(?=[^,]*$)/, " and");

  if (selectedCareSetting) {
    description += ` from ${selectedCareSetting.label}`;
  }

  if (activeOnOrAfter) {
    const date = formatDate(new Date(activeOnOrAfter), { mode: "standard" });
    if (activeOnOrBefore) {
      description += ` from ${date}`;
    } else {
      description += ` on or after ${date}`;
    }
  }

  if (activeOnOrBefore) {
    const date = formatDate(new Date(activeOnOrBefore), { mode: "standard" });
    if (activeOnOrAfter) {
      description += ` to ${date}`;
    } else {
      description += ` on or before ${date}`;
    }
  }

  if (activatedOnOrAfter) {
    const date = formatDate(new Date(activatedOnOrAfter), { mode: "standard" });
    if (activatedOnOrBefore) {
      description += ` from ${date}`;
    } else {
      description += ` on or after ${date}`;
    }
  }

  if (activatedOnOrBefore) {
    const date = formatDate(new Date(activatedOnOrBefore), {
      mode: "standard",
    });
    if (activatedOnOrAfter) {
      description += ` to ${date}`;
    } else {
      description += ` on or before ${date}`;
    }
  }

  return description;
};

export const getQueryDetails = ({
  selectedDrugs,
  selectedCareSetting,
  activeOnOrBefore,
  activeOnOrAfter,
  activatedOnOrBefore,
  activatedOnOrAfter,
}: DrugOrderDetails) => {
  const searchParams = { drugOrderSearch: [] };
  if (activeOnOrAfter) {
    searchParams.drugOrderSearch.push({
      name: "activeOnOrAfter",
      value: activeOnOrAfter,
    });
  }

  if (activatedOnOrAfter) {
    searchParams.drugOrderSearch.push({
      name: "activatedOnOrAfter",
      value: activatedOnOrAfter,
    });
  }

  if (activatedOnOrBefore) {
    searchParams.drugOrderSearch.push({
      name: "activatedOnOrBefore",
      value: activatedOnOrBefore,
    });
  }

  if (selectedCareSetting) {
    searchParams.drugOrderSearch.push({
      name: "careSetting",
      value: selectedCareSetting.value,
    });
  }

  if (selectedDrugs.length) {
    searchParams.drugOrderSearch.push({
      name: "drugs",
      value: selectedDrugs.map((form) => form.value),
    });
  }

  if (activeOnOrBefore) {
    searchParams.drugOrderSearch.push({
      name: "activeOnOrBefore",
      value: activeOnOrBefore,
    });
  }

  return composeJson(searchParams);
};
