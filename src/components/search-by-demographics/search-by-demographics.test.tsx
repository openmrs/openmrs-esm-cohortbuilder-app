import React from 'react';
import { vi, describe, it, expect } from 'vitest';
import dayjs from 'dayjs';
import userEvent from '@testing-library/user-event';
import { render, screen } from '@testing-library/react';
import SearchByDemographics from './search-by-demographics.component';

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
        key: 'reporting.library.cohortDefinition.builtIn.males',
        type: 'org.openmrs.module.reporting.dataset.definition.PatientDataSetDefinition',
      },
      {
        key: 'reporting.library.cohortDefinition.builtIn.ageRangeOnDate',
        parameterValues: {
          minAge: 10,
          maxAge: 20,
        },
        type: 'org.openmrs.module.reporting.dataset.definition.PatientDataSetDefinition',
      },
      {
        key: 'reporting.library.cohortDefinition.builtIn.diedDuringPeriod',
        parameterValues: {
          endDate: '2022-07-09T17:12:47+05:30',
        },
        type: 'org.openmrs.module.reporting.dataset.definition.PatientDataSetDefinition',
      },
    ],
    customRowFilterCombination: '1 AND 2 AND NOT 3',
  },
};

describe('Test the search by demographics component', () => {
  it('should be able to select input values', async () => {
    const user = userEvent.setup();
    const mockSubmit = vi.fn();

    render(<SearchByDemographics onSubmit={mockSubmit} />);

    await user.click(screen.getByTestId('Male'));
    const minAgeInput = screen.getByTestId('minAge');
    const maxAgeInput = screen.getByTestId('maxAge');

    await user.click(minAgeInput);
    await user.type(minAgeInput, '10');
    await user.click(maxAgeInput);
    await user.type(maxAgeInput, '20');

    const testDate = dayjs();
    expectedQuery.query.rowFilters[2].parameterValues.endDate = testDate.format();

    await user.click(screen.getByTestId('search-btn'));

    // Get the actual call arguments
    const [actualQuery, actualDescription] = mockSubmit.mock.calls[0];

    // Verify the query structure matches expected
    expect(actualQuery.query.type).toBe(expectedQuery.query.type);
    expect(actualQuery.query.columns).toEqual(expectedQuery.query.columns);
    expect(actualQuery.query.customRowFilterCombination).toBe(expectedQuery.query.customRowFilterCombination);

    // Verify the row filter structure matches expected
    expect(actualQuery.query.rowFilters[0].key).toBe(expectedQuery.query.rowFilters[0].key);
    expect(actualQuery.query.rowFilters[0].type).toBe(expectedQuery.query.rowFilters[0].type);
    expect(actualQuery.query.rowFilters[1].parameterValues).toEqual(expectedQuery.query.rowFilters[1].parameterValues);

    // Verify dates are within a reasonable range (5 seconds)
    const actualDate = dayjs(actualQuery.query.rowFilters[2].parameterValues.endDate);
    expect(actualDate.isValid()).toBe(true);
    expect(Math.abs(actualDate.diff(testDate, 'second'))).toBeLessThanOrEqual(5);

    // Verify the description matches
    expect(actualDescription).toBe('Male Patients with ages between 10 and 20 years that are alive');
  });
});
