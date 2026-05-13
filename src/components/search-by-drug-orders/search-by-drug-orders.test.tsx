import React from 'react';
import { vi, describe, it, expect, type Mock } from 'vitest';
import userEvent from '@testing-library/user-event';
import { openmrsFetch } from '@openmrs/esm-framework';
import { render, screen } from '@testing-library/react';
import { useCareSettings, useDrugs } from './search-by-drug-orders.resources';
import type * as SearchByDrugOrdersResources from './search-by-drug-orders.resources';
import SearchByDrugOrder from './search-by-drug-orders.component';

const mockCareSettings = [
  {
    id: 0,
    label: 'Isolation Ward',
    value: 'ac7d7773-fe9f-11ec-8b9b-0242ac1b1102',
  },
  {
    id: 1,
    label: 'Armani Hospital',
    value: '8d8718c2-c2cc-11de-8d13-0010c6effd0f',
  },
  {
    id: 2,
    label: 'Pharmacy',
    value: '8d871afc-c2cc-11de-8d13-0010c6dffd0f',
  },
];

const mockDrugs = [
  {
    id: 0,
    label: 'Triomune-40',
    value: 'ac7d7773-fe9f-11ec-8b9b-0242ac1b0402',
  },
  {
    id: 1,
    label: 'Valium',
    value: '8d8718c2-c2cc-11de-8d13-0010c6dffd0f',
  },
  {
    id: 2,
    label: 'Aspirin',
    value: '9d971afc-c2cc-11de-8d13-0010c6dffd0f',
  },
];

const expectedQuery = {
  query: {
    type: 'org.openmrs.module.reporting.dataset.definition.PatientDataSetDefinition',
    columns: [
      {
        name: 'firstname',
        key: 'reporting.library.patientDataDefinition.builtIn.preferredName.givenName',
        type: 'org.openmrs.module.reporting.data.patient.definition.PatientDataDefinition',
      },
      {
        name: 'lastname',
        key: 'reporting.library.patientDataDefinition.builtIn.preferredName.familyName',
        type: 'org.openmrs.module.reporting.data.patient.definition.PatientDataDefinition',
      },
      {
        name: 'gender',
        key: 'reporting.library.patientDataDefinition.builtIn.gender',
        type: 'org.openmrs.module.reporting.data.patient.definition.PatientDataDefinition',
      },
      {
        name: 'age',
        key: 'reporting.library.patientDataDefinition.builtIn.ageOnDate.fullYears',
        type: 'org.openmrs.module.reporting.data.patient.definition.PatientDataDefinition',
      },
      {
        name: 'patientId',
        key: 'reporting.library.patientDataDefinition.builtIn.patientId',
        type: 'org.openmrs.module.reporting.data.patient.definition.PatientDataDefinition',
      },
    ],
    rowFilters: [
      {
        key: 'reporting.library.cohortDefinition.builtIn.drugOrderSearch',
        parameterValues: {
          careSetting: mockCareSettings[2].value,
          drugs: [mockDrugs[1].value, mockDrugs[2].value],
        },
        type: 'org.openmrs.module.reporting.dataset.definition.PatientDataSetDefinition',
      },
    ],
    customRowFilterCombination: '1',
  },
};

vi.mock('./search-by-drug-orders.resources', async (importOriginal) => {
  const original = await importOriginal<typeof SearchByDrugOrdersResources>();
  return {
    ...original,
    useCareSettings: vi.fn(),
    useDrugs: vi.fn(),
  };
});

const mockOpenmrsFetch = openmrsFetch as Mock;
const mockUseCareSettings = vi.mocked(useCareSettings);
const mockUseDrugs = vi.mocked(useDrugs);

describe('Test the search by drug orders component', () => {
  it('should be able to select input values', async () => {
    const user = userEvent.setup();

    mockUseCareSettings.mockImplementation(() => ({
      careSettings: mockCareSettings,
      isLoading: false,
      careSettingsError: undefined,
    }));

    mockOpenmrsFetch.mockReturnValueOnce({
      data: { results: mockCareSettings },
    });

    mockUseDrugs.mockImplementation(() => ({
      drugs: mockDrugs,
      isLoading: false,
      drugsError: undefined,
    }));

    mockOpenmrsFetch.mockReturnValueOnce({
      data: { results: mockCareSettings },
    });

    const mockSubmit = vi.fn();

    render(<SearchByDrugOrder onSubmit={mockSubmit} />);

    await user.click(screen.getByText(/select drugs/i));
    await user.click(screen.getByText(mockDrugs[1].label));
    await user.click(screen.getByText(mockDrugs[2].label));
    await user.click(screen.getByTitle(mockCareSettings[0].label));
    await user.click(screen.getByText(mockCareSettings[2].label));
    await user.click(screen.getByTestId('search-btn'));

    expect(mockSubmit).toBeCalledWith(
      expectedQuery,
      `Patients who taking ${mockDrugs[1].label} and ${mockDrugs[2].label} from Pharmacy`,
    );
  });
});
