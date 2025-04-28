import React from 'react';
import userEvent from '@testing-library/user-event';
import { render, screen, waitFor } from '@testing-library/react';
import { openmrsFetch } from '@openmrs/esm-framework';
import { useLocations } from '../../cohort-builder.resources';
import { useForms, useEncounterTypes } from './search-by-encounters.resources';
import SearchByEncounters from './search-by-encounters.component';

const mockUseEncounterTypes = jest.mocked(useEncounterTypes);
const mockUseForms = jest.mocked(useForms);
const mockUseLocations = jest.mocked(useLocations);
const mockOpenmrsFetch = openmrsFetch as jest.Mock;

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

const mockEncounterTypes = [
  {
    id: 0,
    value: '0cd5d4cb-204e-419a-9dd7-1e18e939ce4c',
    label: 'Patient Tracing Form',
  },
  {
    id: 1,
    value: '3044916a-7e5f-478b-9091-803233f27f91',
    label: 'Transfer Out',
  },
  {
    id: 2,
    value: '41af1931-184e-45f8-86ca-d42e0db0b8a1',
    label: 'Viral Load results',
  },
  {
    id: 3,
    value: 'd7151f82-c1f3-4152-a605-2f9ea7414a79',
    label: 'Visit Note',
  },
  {
    id: 4,
    value: '67a71486-1a54-468f-ac3e-7091a9a79584',
    label: 'Vitals',
  },
];

const mockForms = [
  {
    id: 0,
    value: 'bb826dc9-8c1a-4b19-83c9-b59e5e128a7b',
    label: 'POC Patient Consent',
  },
  {
    id: 1,
    value: '9326eb32-d0fd-40c3-8c30-69d5774af06d',
    label: 'POC Patient Consent v1.2',
  },
  {
    id: 2,
    value: '7f5ce1d4-a42e-4b59-840e-f239d844cf9b',
    label: 'POC Test Form',
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
          atLeastCount: 10,
          atMostCount: 20,
          encounterTypeList: [mockEncounterTypes[4].value],
          formList: [mockForms[1].value],
          locationList: [mockLocations[2].value],
        },
        type: 'org.openmrs.module.reporting.dataset.definition.PatientDataSetDefinition',
      },
    ],
    type: 'org.openmrs.module.reporting.dataset.definition.PatientDataSetDefinition',
  },
};

jest.mock('./search-by-encounters.resources', () => {
  const original = jest.requireActual('./search-by-encounters.resources');
  return {
    ...original,
    useForms: jest.fn(),
    useEncounterTypes: jest.fn(),
  };
});

jest.mock('../../cohort-builder.resources', () => {
  const original = jest.requireActual('../../cohort-builder.resources');
  return {
    ...original,
    useLocations: jest.fn(),
  };
});

describe('Test the search by encounters component', () => {
  it('should be able to select input values', async () => {
    const user = userEvent.setup();

    mockUseForms.mockImplementation(() => ({
      forms: mockForms,
      isLoading: false,
      formsError: undefined,
    }));

    mockOpenmrsFetch.mockReturnValueOnce({
      data: { results: mockForms },
    });

    mockUseEncounterTypes.mockImplementation(() => ({
      encounterTypes: mockEncounterTypes,
      isLoading: false,
      encounterTypesError: undefined,
    }));

    mockOpenmrsFetch.mockReturnValueOnce({
      data: { results: mockEncounterTypes },
    });

    mockUseLocations.mockImplementation(() => ({
      locations: mockLocations,
      isLoading: false,
      locationsError: undefined,
    }));

    mockOpenmrsFetch.mockReturnValueOnce({
      data: { results: mockLocations },
    });

    const mockSubmit = jest.fn();

    render(<SearchByEncounters onSubmit={mockSubmit} />);

    await user.click(screen.getByText(/select encounter types/i));
    await user.click(screen.getByText(/vitals/i));
    await user.click(screen.getByText(/select forms/i));
    await user.click(screen.getByText(/poc patient consent v1.2/i));

    const locationsDropdown = screen.getByText(/select locations/i);
    await user.click(locationsDropdown);

    // Wait for and click the location option
    await waitFor(() => {
      const locationOption = screen.getByText(/pharmacy/i);
      expect(locationOption).toBeInTheDocument();
      return locationOption;
    }).then(async (locationOption) => {
      await user.click(locationOption);
    });

    const atLeastCountInput = screen.getByRole('spinbutton', { name: /at least/i });
    const atMostCountInput = screen.getByRole('spinbutton', { name: /upto this many/i });

    await user.click(atLeastCountInput);
    await user.clear(atLeastCountInput);
    await user.type(atLeastCountInput, '10');

    await user.click(atMostCountInput);
    await user.clear(atMostCountInput);
    await user.type(atMostCountInput, '20');

    await user.click(screen.getByRole('button', { name: /search/i }));

    expect(mockSubmit).toBeCalledWith(
      expectedQuery,
      `Patients with Encounter of Types Vitals at Pharmacy from POC Patient Consent v1.2 at least 10 times  and at most 20 times`,
    );
  });
});
