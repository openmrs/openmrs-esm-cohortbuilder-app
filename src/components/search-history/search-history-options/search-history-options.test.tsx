import React from 'react';
import userEvent from '@testing-library/user-event';
import { screen, render } from '@testing-library/react';
import { showModal } from '@openmrs/esm-framework';
import SearchHistoryOptions from './search-history-options.component';

const mockShowModal = jest.mocked(showModal);

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
  updateSearchHistory: jest.fn(),
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

  it('should launch the delete confirmation modal when the delete option is clicked', async () => {
    const user = userEvent.setup();
    render(<SearchHistoryOptions {...testProps} />);

    await user.click(screen.getByRole('button', { name: /options/i }));
    await user.click(screen.getByText(/delete/i));
    expect(mockShowModal).toHaveBeenCalledWith('clear-search-history-modal', {
      closeModal: expect.any(Function),
      onClear: expect.any(Function),
      searchItemName: searchHistoryItem.description,
      size: 'sm',
    });
  });
});
