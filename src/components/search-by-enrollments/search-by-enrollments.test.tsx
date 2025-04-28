import React from 'react';
import userEvent from '@testing-library/user-event';
import { openmrsFetch } from '@openmrs/esm-framework';
import { render, screen } from '@testing-library/react';
import { useLocations } from '../../cohort-builder.resources';
import { usePrograms } from './search-by-enrollments.resources';
import SearchByEnrollments from './search-by-enrollments.component';

const mockLocations = [
  {
    id: 0,
    label: 'Isolation Ward',
    value: 'ac7d7773-fe9f-11ec-8b9b-0242ac1b0002',
  },
  {
    id: 1,
    label: 'Armani Hospital',
    value: '8d8718c2-c2cc-11de-8d13-0010c6dffd0f',
  },
  {
    id: 2,
    label: 'Pharmacy',
    value: '8d871afc-c2cc-11de-8d13-0010c6dffd0f',
  },
];

const mockPrograms = [
  {
    id: 0,
    value: '64f950e6-1b07-4ac0-8e7e-f3e148f3463f',
    label: 'HIV Care and Treatment',
  },
  {
    id: 1,
    value: 'ac1bbc45-8c35-49ff-a574-9553ff789527',
    label: 'HIV Preventative Services (PEP/PrEP)',
  },
];

const expectedQuery = {
  query: {
    columns: [
      {
        key: 'reporting.library.patientDataDefinition.builtIn.preferredName.givenName',
        name: 'firstname',
        type: 'org.openmrs.module.reporting.data.patient.definition.PatientDataDefinition',
      },
      {
        key: 'reporting.library.patientDataDefinition.builtIn.preferredName.familyName',
        name: 'lastname',
        type: 'org.openmrs.module.reporting.data.patient.definition.PatientDataDefinition',
      },
      {
        key: 'reporting.library.patientDataDefinition.builtIn.gender',
        name: 'gender',
        type: 'org.openmrs.module.reporting.data.patient.definition.PatientDataDefinition',
      },
      {
        key: 'reporting.library.patientDataDefinition.builtIn.ageOnDate.fullYears',
        name: 'age',
        type: 'org.openmrs.module.reporting.data.patient.definition.PatientDataDefinition',
      },
      {
        key: 'reporting.library.patientDataDefinition.builtIn.patientId',
        name: 'patientId',
        type: 'org.openmrs.module.reporting.data.patient.definition.PatientDataDefinition',
      },
    ],
    customRowFilterCombination: '1',
    rowFilters: [
      {
        key: 'reporting.library.cohortDefinition.builtIn.patientsWithEnrollment',
        parameterValues: {
          programs: [mockPrograms[0].value],
          locationList: [mockLocations[2].value],
        },
        type: 'org.openmrs.module.reporting.dataset.definition.PatientDataSetDefinition',
      },
    ],
    type: 'org.openmrs.module.reporting.dataset.definition.PatientDataSetDefinition',
  },
};

const mockOpenmrsFetch = openmrsFetch as jest.Mock;
const mockUseLocations = jest.mocked(useLocations);
const mockUsePrograms = jest.mocked(usePrograms);

jest.mock('./search-by-enrollments.resources', () => {
  const original = jest.requireActual('./search-by-enrollments.resources');
  return {
    ...original,
    usePrograms: jest.fn(),
    useLocations: jest.fn(),
  };
});

jest.mock('../../cohort-builder.resources', () => {
  const original = jest.requireActual('../../cohort-builder.resources');
  return {
    ...original,
    useLocations: jest.fn(),
  };
});

describe('Test the search by enrollments component', () => {
  it('should be able to select input values', async () => {
    const user = userEvent.setup();

    mockUseLocations.mockImplementation(() => ({
      locations: mockLocations,
      isLoading: false,
      locationsError: undefined,
    }));
    mockOpenmrsFetch.mockReturnValueOnce({
      data: { results: mockLocations },
    });

    mockUsePrograms.mockImplementation(() => ({
      programs: mockPrograms,
      isLoading: false,
      programsError: undefined,
    }));

    mockOpenmrsFetch.mockReturnValueOnce({
      data: { results: mockPrograms },
    });

    const mockSubmit = jest.fn();
    render(<SearchByEnrollments onSubmit={mockSubmit} />);

    await user.click(screen.getByText(/select locations/i));
    await user.click(screen.getByText(mockLocations[2].label));
    await user.click(screen.getByText(/select programs/i));
    await user.click(screen.getByText(mockPrograms[0].label));
    await user.click(screen.getByTestId('search-btn'));

    expect(mockSubmit).toBeCalledWith(
      expectedQuery,
      `Patients enrolled in ${mockPrograms[0].label} at ${mockLocations[2].label}`,
    );
  });
});
