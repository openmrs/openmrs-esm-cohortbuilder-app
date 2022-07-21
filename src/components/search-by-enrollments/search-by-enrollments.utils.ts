import { composeJson } from "../../cohort-builder.utils";
import { DropdownValue } from "../../types";

interface EnrollmentsSearchParams {
  enrolledOnOrAfter: string;
  enrolledOnOrBefore: string;
  completedOnOrAfter: string;
  completedOnOrBefore: string;
  selectedPrograms: DropdownValue[];
  selectedLocations: DropdownValue[];
}

export const getQueryDetails = ({
  enrolledOnOrAfter,
  enrolledOnOrBefore,
  completedOnOrAfter,
  completedOnOrBefore,
  selectedPrograms,
  selectedLocations,
}: EnrollmentsSearchParams) => {
  const locations = [];
  selectedLocations?.map((location) => locations.push(location.value));

  const programs = [];
  selectedPrograms?.map((location) => programs.push(location.value));

  const searchParameter = {
    patientsWithEnrollment: [
      { name: "programs", value: programs },
      enrolledOnOrAfter && {
        name: "enrolledOnOrAfter",
        value: enrolledOnOrAfter,
      },
      enrolledOnOrBefore && {
        name: "enrolledOnOrBefore",
        value: enrolledOnOrBefore,
      },
      completedOnOrAfter && {
        name: "completedOnOrAfter",
        value: completedOnOrAfter,
      },
      completedOnOrBefore && {
        name: "completedOnOrBefore",
        value: completedOnOrBefore,
      },
      { name: "locationList", value: locations },
    ],
  };
  const queryDetails = composeJson(searchParameter);

  return queryDetails;
};

export const getDescription = ({
  selectedPrograms,
  selectedLocations,
}: EnrollmentsSearchParams) => {
  const programs = [];
  selectedPrograms?.map((location) => programs.push(location.label));
  let description = `Patients enrolled in ${programs.join(",")}`;

  if (selectedLocations.length) {
    const locations = [];
    selectedLocations?.map((location) => locations.push(location.label));
    description = description + ` at ${locations.join(",")}`;
  }

  return description;
};
