import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import dayjs from 'dayjs';
import { type Concept } from '../../types';
import { getConcepts } from './search-concept/search-concept.resource';
import SearchByConcepts from './search-by-concepts.component';

const mockGetConcepts = jest.mocked(getConcepts);

jest.mock('./search-concept/search-concept.resource.ts', () => ({
  getConcepts: jest.fn().mockImplementation((searchTerm) => {
    if (searchTerm === 'blood sugar') {
      return Promise.resolve(concepts);
    }
    return Promise.resolve([]);
  }),
}));

const createExpectedQuery = (date: dayjs.Dayjs) => ({
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
        key: 'reporting.library.cohortDefinition.builtIn.numericObsSearchAdvanced',
        parameterValues: {
          onOrBefore: date.format(),
          operator1: 'LESS_THAN',
          question: '2a08da66-f326-4cac-b4cc-6efd68333847',
          timeModifier: 'ANY',
        },
        type: 'org.openmrs.module.reporting.dataset.definition.PatientDataSetDefinition',
      },
    ],
    customRowFilterCombination: '1',
  },
});

const concepts: Concept[] = [
  {
    uuid: '1000AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    units: '',
    answers: [],
    hl7Abbrev: 'ZZ',
    name: 'Whole blood sample',
    description: 'Blood samples not seperated into subtypes',
    datatype: {
      uuid: '8d4a4c94-c2cc-11de-8d13-0010c6dffd0f',
      name: 'N/A',
      description: 'Not associated with a datatype (e.g., term answers, sets)',
      hl7Abbreviation: 'ZZ',
    },
  },
  {
    uuid: '2a08da66-f326-4cac-b4cc-6efd68333847',
    units: 'mg/dl',
    answers: [],
    hl7Abbrev: 'NM',
    name: 'BLOOD SUGAR',
    description: 'Laboratory measurement of the glucose level in the blood.',
    datatype: {
      uuid: '8d4a4488-c2cc-11de-8d13-0010c6dffd0f',
      name: 'Numeric',
      description: 'Numeric value, including integer or float (e.g., creatinine, weight)',
      hl7Abbreviation: 'NM',
    },
  },
];

describe('Test the search by concept component', () => {
  it('should be able to select input values', async () => {
    const user = userEvent.setup();
    const mockSubmit = jest.fn();
    const testDate = dayjs().subtract(15, 'days').subtract(4, 'months');

    render(<SearchByConcepts onSubmit={mockSubmit} />);

    const searchInput = screen.getByPlaceholderText('Search Concepts');
    const lastDaysInput = screen.getByTestId('last-days');
    const lastMonthsInput = screen.getByTestId('last-months');

    await user.click(searchInput);
    await user.type(searchInput, 'blood sugar');

    await waitFor(() => {
      expect(mockGetConcepts).toBeCalledWith('blood sugar');
    });

    await user.click(screen.getByText('BLOOD SUGAR'));
    await user.click(lastDaysInput);
    await user.clear(lastDaysInput);
    await user.type(lastDaysInput, '15');
    await user.click(lastMonthsInput);
    await user.clear(lastMonthsInput);
    await user.type(lastMonthsInput, '4');
    await user.click(screen.getByText('Any'));

    await user.click(screen.getByTestId('search-btn'));

    // Verify the mock was called
    expect(mockSubmit).toHaveBeenCalled();

    // Get the actual call arguments
    const [actualQuery, actualDescription] = mockSubmit.mock.calls[0];

    // Verify the query structure matches expected
    const expectedQuery = createExpectedQuery(testDate);
    expect(actualQuery.query.type).toBe(expectedQuery.query.type);
    expect(actualQuery.query.columns).toEqual(expectedQuery.query.columns);
    expect(actualQuery.query.customRowFilterCombination).toBe(expectedQuery.query.customRowFilterCombination);

    // Verify the row filter structure matches expected
    expect(actualQuery.query.rowFilters[0].key).toBe(expectedQuery.query.rowFilters[0].key);
    expect(actualQuery.query.rowFilters[0].type).toBe(expectedQuery.query.rowFilters[0].type);
    expect(actualQuery.query.rowFilters[0].parameterValues.operator1).toBe(
      expectedQuery.query.rowFilters[0].parameterValues.operator1,
    );
    expect(actualQuery.query.rowFilters[0].parameterValues.question).toBe(
      expectedQuery.query.rowFilters[0].parameterValues.question,
    );
    expect(actualQuery.query.rowFilters[0].parameterValues.timeModifier).toBe(
      expectedQuery.query.rowFilters[0].parameterValues.timeModifier,
    );

    // Verify the date is within a reasonable range (within 1 second)
    const actualDate = dayjs(actualQuery.query.rowFilters[0].parameterValues.onOrBefore);
    expect(actualDate.isValid()).toBe(true);
    expect(actualDate.diff(testDate, 'second')).toBeLessThanOrEqual(1);

    // Verify the description format
    expect(actualDescription).toMatch(/^Patients with ANY BLOOD SUGAR\s+until\s+\d{1,2}\/\d{1,2}\/\d{4}$/);
  });
});
