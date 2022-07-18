import React from "react";

import { render, cleanup, fireEvent, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import dayjs from "dayjs";

import SearchByDemographics from "./search-by-demographics.component";

const expectedQuery = {
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

  it("should be able to select input values", async () => {
    const submit = jest.fn();
    const { getByTestId } = render(<SearchByDemographics onSubmit={submit} />);
    fireEvent.click(getByTestId("Male"));
    const minAgeInput = getByTestId("minAge");
    const maxAgeInput = getByTestId("maxAge");
    fireEvent.click(minAgeInput);
    await userEvent.type(minAgeInput, "10");
    fireEvent.click(maxAgeInput);
    await userEvent.type(maxAgeInput, "20");
    expectedQuery.query.rowFilters[2].parameterValues.endDate =
      dayjs().format();
    fireEvent.click(getByTestId("search-btn"));
    await act(async () => {
      expect(submit).toBeCalledWith(
        expectedQuery,
        "Male Patients with ages between 10 and 20 years that are alive"
      );
    });
  });
});
