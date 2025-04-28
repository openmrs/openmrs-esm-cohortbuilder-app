import React from 'react';
import userEvent from '@testing-library/user-event';
import { render, screen, waitFor } from '@testing-library/react';
import { showSnackbar } from '@openmrs/esm-framework';
import Composition from './composition.component';

const mockCompositionQuery = {
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
        key: 'reporting.library.cohortDefinition.builtIn.codedObsSearchAdvanced',
        parameterValues: {
          operator1: 'LESS_THAN',
          question: '163126AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
          timeModifier: 'NO',
        },
        type: 'org.openmrs.module.reporting.dataset.definition.PatientDataSetDefinition',
      },
      {
        key: 'reporting.library.cohortDefinition.builtIn.encounterSearchAdvanced',
        parameterValues: {
          locationList: [
            '1ce1b7d4-c865-4178-82b0-5932e51503d6',
            'ba685651-ed3b-4e63-9b35-78893060758a',
            '44c3efb0-2583-4c80-a79e-1f756a03c0a1',
          ],
          timeQualifier: 'ANY',
        },
        type: 'org.openmrs.module.reporting.dataset.definition.PatientDataSetDefinition',
      },
    ],
    customRowFilterCombination: '(1) and (2)',
  },
};

jest.mock('./composition.utils', () => {
  const original = jest.requireActual('./composition.utils');
  return {
    ...original,
    createCompositionQuery: jest.fn().mockImplementation(() => mockCompositionQuery),
    isCompositionValid: jest.fn().mockImplementation((query) => query === '1 and 2'),
  };
});

describe('Composition', () => {
  it('should show error notification when an invalid composition query is entered', async () => {
    const user = userEvent.setup();
    const mockSubmit = jest.fn();
    render(<Composition onSubmit={mockSubmit} />);

    const compositionInput = screen.getByRole('textbox', { name: /composition/i });
    await user.click(compositionInput);
    await user.type(compositionInput, 'random text');
    await user.click(screen.getByRole('button', { name: /search/i }));

    expect(mockSubmit).not.toHaveBeenCalled();
    expect(showSnackbar).toHaveBeenCalledWith({
      title: 'Error!',
      kind: 'error',
      isLowContrast: true,
      subtitle: 'Composition is not valid',
    });
  });

  it('should submit a valid composition query', async () => {
    const compositionQuery = '1 and 2';
    const user = userEvent.setup();
    const mockSubmit = jest.fn();
    render(<Composition onSubmit={mockSubmit} />);

    const compositionInput = screen.getByRole('textbox', { name: /composition/i });
    await user.click(compositionInput);
    await user.type(compositionInput, compositionQuery);
    await user.click(screen.getByRole('button', { name: /search/i }));

    expect(mockSubmit).toHaveBeenCalledWith(mockCompositionQuery, `Composition of ${compositionQuery}`);
  });

  it('should handle reset functionality', async () => {
    const user = userEvent.setup();
    const mockSubmit = jest.fn().mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 100)));
    render(<Composition onSubmit={mockSubmit} />);

    // Test loading state
    const compositionInput = screen.getByRole('textbox', { name: /composition/i });
    await user.click(compositionInput);
    await user.type(compositionInput, '1 and 2');
    await user.click(screen.getByRole('button', { name: /search/i }));

    // Wait for submit to complete
    await waitFor(() => {
      expect(mockSubmit).toHaveBeenCalled();
    });

    // Test reset functionality
    await user.click(screen.getByRole('button', { name: /reset/i }));
    expect(compositionInput).toHaveValue('');
    expect(screen.getByRole('textbox', { name: /description/i })).toHaveValue('');
  });

  it('should automatically update the description when composition changes', async () => {
    const user = userEvent.setup();
    render(<Composition onSubmit={jest.fn()} />);

    const compositionInput = screen.getByRole('textbox', { name: /composition/i });
    await user.click(compositionInput);
    await user.type(compositionInput, '1 and 2');

    expect(screen.getByRole('textbox', { name: /description/i })).toHaveValue('Composition of 1 and 2');
  });
});
