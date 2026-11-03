import { composeJson } from '../../cohort-builder.utils';
import { type DropdownValue } from '../../types';

export interface EnrollmentsSearchParams {
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
  const searchParameter = {
    patientsWithEnrollment: [
      {
        name: 'programs',
        value: selectedPrograms?.map((location) => location.value),
      },
      enrolledOnOrAfter && {
        name: 'enrolledOnOrAfter',
        value: enrolledOnOrAfter,
      },
      enrolledOnOrBefore && {
        name: 'enrolledOnOrBefore',
        value: enrolledOnOrBefore,
      },
      completedOnOrAfter && {
        name: 'completedOnOrAfter',
        value: completedOnOrAfter,
      },
      completedOnOrBefore && {
        name: 'completedOnOrBefore',
        value: completedOnOrBefore,
      },
      // No locations chosen means any location, which the server reads from a missing list as from an empty one.
      selectedLocations?.length > 0 && {
        name: 'locationList',
        value: selectedLocations.map((location) => location.value),
      },
    ],
  };
  const queryDetails = composeJson(searchParameter);

  return queryDetails;
};

export const getDescription = ({ selectedPrograms, selectedLocations }: EnrollmentsSearchParams) => {
  let description = `Patients enrolled in ${selectedPrograms?.map((location) => location.label).join(', ')}`;

  if (selectedLocations?.length) {
    description = description + ` at ${selectedLocations?.map((location) => location.label).join(', ')}`;
  }

  return description;
};
