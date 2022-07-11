import dayjs from "dayjs";

import { composeJson } from "../../cohort-builder.utils";

interface DemographicsSearchParams {
  gender: string;
  ageRangeOnDate?: Value[];
  atLeastAgeOnDate?: Value[];
  upToAgeOnDate?: Value[];
  bornDuringPeriod?: Value[];
  diedDuringPeriod?: Value[];
}

interface Value {
  name: string;
  value: number | string;
  dataType?: string;
  livingStatus?: string;
}

interface Demographics {
  gender: string;
  minAge: number;
  maxAge: number;
  birthDayStartDate: string;
  birthDayEndDate: string;
  livingStatus: string;
}

export const getDescription = ({
  gender,
  minAge,
  maxAge,
  birthDayStartDate,
  birthDayEndDate,
  livingStatus,
}: Demographics) => {
  let description =
    gender != "all"
      ? `${gender === "males" ? "Male" : "Female"} Patients`
      : "All Patients";
  if (minAge || maxAge) {
    if (minAge && maxAge) {
      description += ` with ages between ${minAge} and ${maxAge}`;
    } else {
      description += minAge
        ? ` with minimum age of ${minAge}`
        : ` with maximum age of ${maxAge}`;
    }
    description += " years";
  }
  if (birthDayStartDate != "" || birthDayEndDate != "") {
    if (birthDayStartDate && birthDayEndDate) {
      description += ` and birthdate between ${birthDayStartDate} and ${birthDayEndDate}`;
    } else {
      description += minAge
        ? ` and born before ${birthDayStartDate}`
        : ` and born before ${birthDayEndDate}`;
    }
  }
  if (livingStatus) {
    description += ` that are ${livingStatus}`;
  }
  return description;
};

export const getQueryDetails = ({
  gender,
  minAge,
  maxAge,
  birthDayStartDate,
  birthDayEndDate,
  livingStatus,
}: Demographics) => {
  const searchParameters: DemographicsSearchParams = { gender };

  if (minAge && maxAge) {
    searchParameters.ageRangeOnDate = [
      { name: "minAge", value: minAge },
      { name: "maxAge", value: maxAge },
    ];
  } else {
    if (minAge) {
      searchParameters.atLeastAgeOnDate = [{ name: "minAge", value: minAge }];
    } else {
      searchParameters.upToAgeOnDate = [{ name: "maxAge", value: maxAge }];
    }
  }
  if (birthDayStartDate && birthDayEndDate) {
    searchParameters.bornDuringPeriod = [
      { name: "startDate", dataType: "date", value: birthDayStartDate },
      { name: "endDate", dataType: "date", value: birthDayEndDate },
    ];
  }

  const today = dayjs().format();
  searchParameters.diedDuringPeriod = [
    { name: "endDate", dataType: "date", value: today, livingStatus },
  ];

  const queryDetails = composeJson(searchParameters);

  if (searchParameters.gender === "all") {
    const rowFilterWithAllGenders = ["males", "females", "unknownGender"].map(
      (gender) => {
        return {
          type: "org.openmrs.module.reporting.dataset.definition.PatientDataSetDefinition",
          key: `reporting.library.cohortDefinition.builtIn.${gender}`,
        };
      }
    );
    let {
      query: { rowFilters, customRowFilterCombination },
    } = queryDetails;
    rowFilters =
      rowFilters.length > 0
        ? [...rowFilters, ...rowFilterWithAllGenders]
        : rowFilterWithAllGenders;
    const filters = rowFilters;
    const filterCombination = customRowFilterCombination;
    customRowFilterCombination = filterCombination
      ? `(${filters.length - 2} OR ${filters.length - 1} OR ${
          filters.length
        }) AND ${filterCombination}`
      : "(1 OR 2 OR 3)";
  }

  return queryDetails;
};
