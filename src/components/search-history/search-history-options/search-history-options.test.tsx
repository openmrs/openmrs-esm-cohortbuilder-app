import React from 'react';
import { vi, describe, it, expect } from 'vitest';
import userEvent from '@testing-library/user-event';
import { screen, render } from '@testing-library/react';
import type * as SWR from 'swr';
import { showModal } from '@openmrs/esm-framework';
import { savedCohortsKey } from '../../saved-cohorts/saved-cohorts.resources';
import { savedQueriesKey } from '../../saved-queries/saved-queries.resources';
import { createCohort, createQuery } from './search-history-options.resources';
import type * as SearchHistoryOptionsResources from './search-history-options.resources';
import SearchHistoryOptions from './search-history-options.component';

const mockShowModal = vi.mocked(showModal);
const mockCreateCohort = vi.mocked(createCohort);
const mockCreateQuery = vi.mocked(createQuery);
const mockMutate = vi.fn();

vi.mock('swr', async (importOriginal) => {
  const original = await importOriginal<typeof SWR>();
  return {
    ...original,
    useSWRConfig: () => ({ ...original.useSWRConfig(), mutate: mockMutate }),
  };
});

vi.mock('./search-history-options.resources', async (importOriginal) => {
  const original = await importOriginal<typeof SearchHistoryOptionsResources>();
  return {
    ...original,
    createCohort: vi.fn(),
    createQuery: vi.fn(),
  };
});

const searchHistoryItem = {
  description: 'Patients with NO Chronic viral hepatitis',
  patients: [
    {
      firstname: 'Horatio',
      gender: 'M',
      patientId: 2,
      age: 81,
      lastname: 'Hornblower',
      id: '2',
      name: 'Horatio Hornblower',
    },
    {
      firstname: 'John',
      gender: 'M',
      patientId: 3,
      age: 47,
      lastname: 'Patient',
      id: '3',
      name: 'John Patient',
    },
  ],
  parameters: {
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
        key: 'reporting.library.cohortDefinition.builtIn.codedObsSearchAdvanced',
        parameterValues: {
          operator1: 'LESS_THAN',
          question: '145131AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
          timeModifier: 'NO',
        },
        type: 'org.openmrs.module.reporting.dataset.definition.PatientDataSetDefinition',
      },
    ],
    customRowFilterCombination: '1',
  },
  id: '1',
  results: '2',
};

const testProps = {
  searchItem: searchHistoryItem,
  updateSearchHistory: vi.fn(),
};

describe('Test the search history options', () => {
  it('should launch the save cohort modal when the save cohort option is clicked', async () => {
    const user = userEvent.setup();

    render(<SearchHistoryOptions {...testProps} />);

    await user.click(screen.getByRole('button', { name: /options/i }));
    await user.click(screen.getByText(/save cohort/i));
    expect(mockShowModal).toHaveBeenCalledWith('save-cohort-modal', {
      closeModal: expect.any(Function),
      onSave: expect.any(Function),
      size: 'sm',
    });
  });

  it('should launch the save query modal when the save query option is clicked', async () => {
    const user = userEvent.setup();
    render(<SearchHistoryOptions {...testProps} />);

    await user.click(screen.getByRole('button', { name: /options/i }));
    await user.click(screen.getByText(/save query/i));
    expect(mockShowModal).toHaveBeenCalledWith('save-query-modal', {
      closeModal: expect.any(Function),
      onSaveQuery: expect.any(Function),
      size: 'sm',
    });
  });

  it('should save the query with the name and description entered in the modal', async () => {
    const user = userEvent.setup();
    mockCreateQuery.mockResolvedValue(undefined);
    render(<SearchHistoryOptions {...testProps} />);

    await user.click(screen.getByRole('button', { name: /options/i }));
    await user.click(screen.getByText(/save query/i));

    const [, modalProps] = mockShowModal.mock.calls.find(([modalName]) => modalName === 'save-query-modal');
    const { onSaveQuery } = modalProps as {
      onSaveQuery: (data: { queryName: string; queryDescription: string }) => Promise<void>;
    };
    await onSaveQuery({ queryName: 'Male patients', queryDescription: 'All male patients' });

    expect(mockCreateQuery).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Male patients', description: 'All male patients' }),
    );
  });

  it('should launch the delete confirmation modal when the delete option is clicked', async () => {
    const user = userEvent.setup();
    render(<SearchHistoryOptions {...testProps} />);

    await user.click(screen.getByRole('button', { name: /options/i }));
    await user.click(screen.getByText(/delete/i));
    expect(mockShowModal).toHaveBeenCalledWith('clear-item-from-search-history-modal', {
      closeModal: expect.any(Function),
      onRemove: expect.any(Function),
      searchItemName: searchHistoryItem.description,
      size: 'sm',
    });
  });
  it('should refresh the saved queries list after saving a query', async () => {
    const user = userEvent.setup();
    mockCreateQuery.mockResolvedValue(undefined);
    render(<SearchHistoryOptions {...testProps} />);

    await user.click(screen.getByRole('button', { name: /options/i }));
    await user.click(screen.getByText(/save query/i));

    const [, modalProps] = mockShowModal.mock.calls.find(([modalName]) => modalName === 'save-query-modal');
    const { onSaveQuery } = modalProps as {
      onSaveQuery: (data: { queryName: string; queryDescription: string }) => Promise<void>;
    };
    await onSaveQuery({ queryName: 'Male patients', queryDescription: 'All male patients' });

    expect(mockCreateQuery).toHaveBeenCalled();
    expect(mockMutate).toHaveBeenCalledWith(savedQueriesKey);
  });

  it('should refresh the saved cohorts list after saving a cohort', async () => {
    const user = userEvent.setup();
    mockCreateCohort.mockResolvedValue(undefined);
    render(<SearchHistoryOptions {...testProps} />);

    await user.click(screen.getByRole('button', { name: /options/i }));
    await user.click(screen.getByText(/save cohort/i));

    const [, modalProps] = mockShowModal.mock.calls.find(([modalName]) => modalName === 'save-cohort-modal');
    const { onSave } = modalProps as { onSave: (name: string, description: string) => Promise<void> };
    await onSave('Male patients', 'All male patients');

    expect(mockCreateCohort).toHaveBeenCalled();
    expect(mockMutate).toHaveBeenCalledWith(savedCohortsKey);
  });
});
