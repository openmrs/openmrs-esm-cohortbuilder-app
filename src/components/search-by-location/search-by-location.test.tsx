import React from 'react';
import userEvent from '@testing-library/user-event';
import { openmrsFetch } from '@openmrs/esm-framework';
import { render, screen, waitFor } from '@testing-library/react';
import { useLocations } from '../../cohort-builder.resources';
import SearchByLocation from './search-by-location.component';

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
        key: 'reporting.library.cohortDefinition.builtIn.encounterSearchAdvanced',
        parameterValues: {
          locationList: [mockLocations[2].value],
          timeQualifier: 'LAST',
        },
        type: 'org.openmrs.module.reporting.dataset.definition.PatientDataSetDefinition',
      },
    ],
    type: 'org.openmrs.module.reporting.dataset.definition.PatientDataSetDefinition',
  },
};

const mockOpenmrsFetch = openmrsFetch as jest.Mock;

jest.mock('../../cohort-builder.resources', () => {
  const original = jest.requireActual('../../cohort-builder.resources');
  return {
    ...original,
    useLocations: jest.fn(),
  };
});

const mockUseLocations = jest.mocked(useLocations);

describe('Test the search by location component', () => {
  it('should be able to select input values', async () => {
    const user = userEvent.setup();

    mockUseLocations.mockImplementation(() => ({
      locations: mockLocations,
      isLoading: false,
      locationsError: undefined,
    }));
    mockOpenmrsFetch.mockReturnValueOnce({ data: { results: mockLocations } });

    const mockSubmit = jest.fn();
    render(<SearchByLocation onSubmit={mockSubmit} />);

    await user.click(screen.getByText(/select locations/i));
    await user.click(screen.getByText(mockLocations[2].label));
    await user.click(screen.getByTitle('Any Encounter'));
    await user.click(screen.getByText('Most Recent Encounter'));
    await user.click(screen.getByTestId('search-btn'));

    await waitFor(() => {
      expect(mockSubmit).toBeCalledWith(
        expectedQuery,
        `Patients in ${mockLocations[2].label} (by method ANY_ENCOUNTER).`,
      );
    });
  });
});
