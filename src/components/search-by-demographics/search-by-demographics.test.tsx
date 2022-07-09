import React from "react";

import { render, cleanup, fireEvent } from "@testing-library/react";
import dayjs from "dayjs";

import { SearchByDemographics } from "./search-by-demographics.component";

const mockQuery = {
  query: {
    type: "org.openmrs.module.reporting.dataset.definition.PatientDataSetDefinition",
    columns: [
      {
        name: "firstname",
        key: "reporting.library.patientDataDefinition.builtIn.preferredName.givenName",
        type: "org.openmrs.module.reporting.data.patient.definition.PatientDataDefinition",
      },
      {
        name: "lastname",
        key: "reporting.library.patientDataDefinition.builtIn.preferredName.familyName",
        type: "org.openmrs.module.reporting.data.patient.definition.PatientDataDefinition",
      },
      {
        name: "gender",
        key: "reporting.library.patientDataDefinition.builtIn.gender",
        type: "org.openmrs.module.reporting.data.patient.definition.PatientDataDefinition",
      },
      {
        name: "age",
        key: "reporting.library.patientDataDefinition.builtIn.ageOnDate.fullYears",
        type: "org.openmrs.module.reporting.data.patient.definition.PatientDataDefinition",
      },
      {
        name: "patientId",
        key: "reporting.library.patientDataDefinition.builtIn.patientId",
        type: "org.openmrs.module.reporting.data.patient.definition.PatientDataDefinition",
      },
    ],
    rowFilters: [
      {
        key: "reporting.library.cohortDefinition.builtIn.males",
        type: "org.openmrs.module.reporting.dataset.definition.PatientDataSetDefinition",
      },
      {
        key: "reporting.library.cohortDefinition.builtIn.ageRangeOnDate",
        parameterValues: {
          minAge: "10",
          maxAge: "20",
        },
        type: "org.openmrs.module.reporting.dataset.definition.PatientDataSetDefinition",
      },
      {
        key: "reporting.library.cohortDefinition.builtIn.diedDuringPeriod",
        parameterValues: {
          endDate: "2022-07-09T17:12:47+05:30",
        },
        type: "org.openmrs.module.reporting.dataset.definition.PatientDataSetDefinition",
      },
    ],
    customRowFilterCombination: "1 AND 2 AND NOT 3",
  },
};

describe("Test the search by demographics component", () => {
  afterEach(cleanup);

  it("should be able to select input values", () => {
    const setSearchParams = jest.fn();
    const setQueryDescription = jest.fn();
    const { getByTestId } = render(
      <SearchByDemographics
        setQueryDescription={setQueryDescription}
        setSearchParams={setSearchParams}
        resetInputs={false}
      />
    );
    fireEvent.click(getByTestId("Male"));
    fireEvent.change(getByTestId("minAge"), { target: { value: "10" } });
    fireEvent.change(getByTestId("maxAge"), { target: { value: "20" } });
    mockQuery.query.rowFilters[2].parameterValues.endDate = dayjs().format();
    expect(setSearchParams).toBeCalledWith(mockQuery);
    expect(setQueryDescription).toBeCalledWith(
      "Male Patients with ages between 10 and 20 years that are alive"
    );
  });
});
