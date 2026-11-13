import React from 'react';
import { vi, beforeEach, describe, it, expect, type Mock } from 'vitest';
import userEvent from '@testing-library/user-event';
import { getDefaultsFromConfigSchema, openmrsFetch, showSnackbar, useConfig } from '@openmrs/esm-framework';
import { type ConfigObject, configSchema } from '../../config-schema';
import { toFormValues } from '../../url-definition/url-definition';
import { render, screen, waitFor } from '@testing-library/react';
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
      {
        name: 'identifier',
        key: 'reporting.library.patientDataDefinition.builtIn.preferredIdentifier.identifier',
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
const mockUseConfig = vi.mocked(useConfig<ConfigObject>);

describe('Test the search by drug orders component', () => {
  beforeEach(() => {
    mockUseConfig.mockReturnValue(getDefaultsFromConfigSchema(configSchema));
  });

  it('should report each reference-data error once when requests fail separately', () => {
    mockUseDrugs.mockReturnValue({ drugs: mockDrugs, isLoading: false, drugsError: new Error('Drug request failed') });
    mockUseCareSettings.mockReturnValue({
      careSettings: mockCareSettings,
      isLoading: false,
      careSettingsError: undefined,
    });
    const onSubmit = vi.fn();
    const { rerender } = render(<SearchByDrugOrder onSubmit={onSubmit} />);

    mockUseCareSettings.mockReturnValue({
      careSettings: mockCareSettings,
      isLoading: false,
      careSettingsError: new Error('Care settings request failed'),
    });
    rerender(<SearchByDrugOrder onSubmit={onSubmit} />);
    rerender(<SearchByDrugOrder onSubmit={onSubmit} />);

    expect(vi.mocked(showSnackbar).mock.calls.map(([notification]) => notification.subtitle)).toEqual([
      'Drug request failed',
      'Care settings request failed',
    ]);
  });

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
    await user.click(screen.getByText(/select a care setting/i));
    await user.click(screen.getByText(mockCareSettings[2].label));
    await user.click(screen.getByTestId('search-btn'));

    expect(mockSubmit).toBeCalledWith(
      expectedQuery,
      `Patients who are taking ${mockDrugs[1].label} and ${mockDrugs[2].label} from Pharmacy`,
    );
  });

  it.each([
    ['opened by hand', undefined],
    [
      'filled in by a definition link',
      toFormValues({ v: 1, criteria: [{ type: 'drugOrder', drugs: [mockDrugs[1].value] }] }, new Map()).drugOrder,
    ],
  ])('shows no care setting when it searches without one, %s', async (_, initialValues) => {
    const user = userEvent.setup();
    mockUseConfig.mockReturnValue(getDefaultsFromConfigSchema(configSchema));
    // Already loaded, as when the tab mounts again after a definition link.
    mockUseCareSettings.mockImplementation(() => ({
      careSettings: mockCareSettings,
      isLoading: false,
      careSettingsError: undefined,
    }));
    mockUseDrugs.mockImplementation(() => ({ drugs: mockDrugs, isLoading: false, drugsError: undefined }));
    const mockSubmit = vi.fn();

    render(<SearchByDrugOrder onSubmit={mockSubmit} initialValues={initialValues} />);
    if (!initialValues) {
      await user.click(screen.getByText(/select drugs/i));
      await user.click(screen.getByText(mockDrugs[1].label));
    }

    expect(screen.getByText(/select a care setting/i)).toBeInTheDocument();
    expect(screen.queryByTitle(mockCareSettings[0].label)).not.toBeInTheDocument();
    await user.click(screen.getByTestId('search-btn'));
    expect(mockSubmit.mock.calls[0][0].query.rowFilters[0].parameterValues).toEqual({ drugs: [mockDrugs[1].value] });
  });

  it('lets Search run only with a drug, also after Reset clears it', async () => {
    const user = userEvent.setup();
    mockUseConfig.mockReturnValue(getDefaultsFromConfigSchema(configSchema));
    mockUseCareSettings.mockImplementation(() => ({
      careSettings: mockCareSettings,
      isLoading: false,
      careSettingsError: undefined,
    }));
    mockUseDrugs.mockImplementation(() => ({ drugs: mockDrugs, isLoading: false, drugsError: undefined }));
    const mockSubmit = vi.fn();

    render(<SearchByDrugOrder onSubmit={mockSubmit} />);
    expect(screen.getByTestId('search-btn')).toBeDisabled();

    await user.click(screen.getByText(/select drugs/i));
    await user.click(screen.getByText(mockDrugs[1].label));
    await user.keyboard('{Escape}');
    expect(screen.getByTestId('search-btn')).toBeEnabled();

    await user.click(screen.getByTestId('reset-btn'));
    expect(screen.getByTestId('search-btn')).toBeDisabled();
    expect(screen.getByTestId('search-btn')).toHaveTextContent('Search');
    expect(mockSubmit).not.toHaveBeenCalled();
  });

  it('should still search after the inputs are reset', async () => {
    const user = userEvent.setup();
    mockUseCareSettings.mockImplementation(() => ({
      careSettings: mockCareSettings,
      isLoading: false,
      careSettingsError: undefined,
    }));
    mockUseDrugs.mockImplementation(() => ({ drugs: mockDrugs, isLoading: false, drugsError: undefined }));
    const mockSubmit = vi.fn().mockResolvedValue(true);
    render(<SearchByDrugOrder onSubmit={mockSubmit} />);

    await user.click(screen.getByText(/select drugs/i));
    await user.click(screen.getByText(mockDrugs[1].label));
    await user.click(screen.getByTestId('reset-btn'));
    // Search needs a drug, so choose another one.
    await user.click(screen.getByText(/select drugs/i));
    await user.click(screen.getByText(mockDrugs[2].label));
    await user.click(screen.getByTestId('search-btn'));

    await waitFor(() => expect(mockSubmit).toHaveBeenCalledTimes(1));
    expect(mockSubmit.mock.calls[0][1]).not.toContain(mockDrugs[1].label);
    expect(mockSubmit.mock.calls[0][1]).toContain(mockDrugs[2].label);
    expect(screen.getByTestId('search-btn')).toBeEnabled();
  });

  it('searches with the configured definition key', async () => {
    const user = userEvent.setup();
    const drugOrderSearchDefinitionKey = 'configuration.definitionlibrary.cohort.drugOrderSearch';
    mockUseConfig.mockReturnValue({ drugOrderSearchDefinitionKey });
    mockUseCareSettings.mockReturnValue({
      careSettings: mockCareSettings,
      isLoading: false,
      careSettingsError: undefined,
    });
    mockUseDrugs.mockReturnValue({ drugs: mockDrugs, isLoading: false, drugsError: undefined });
    const mockSubmit = vi.fn();
    render(<SearchByDrugOrder onSubmit={mockSubmit} />);

    await user.click(screen.getByText(/select drugs/i));
    await user.click(screen.getByText(mockDrugs[1].label));
    await user.click(screen.getByTestId('search-btn'));

    expect(mockSubmit.mock.calls[0][0].query.rowFilters[0].key).toBe(drugOrderSearchDefinitionKey);
  });
});
