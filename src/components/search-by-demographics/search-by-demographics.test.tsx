import React from 'react';
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
    const mockSubmit = jest.fn();

    render(<SearchByDemographics onSubmit={mockSubmit} />);

    await user.click(screen.getByTestId('Male'));
    const minAgeInput = screen.getByTestId('minAge');
    const maxAgeInput = screen.getByTestId('maxAge');

    await user.click(minAgeInput);
    await user.type(minAgeInput, '10');
    await user.click(maxAgeInput);
    await user.type(maxAgeInput, '20');

    expectedQuery.query.rowFilters[2].parameterValues.endDate = dayjs().format();

    await user.click(screen.getByTestId('search-btn'));
    expect(mockSubmit).toBeCalledWith(expectedQuery, 'Male Patients with ages between 10 and 20 years that are alive');
  });
});
