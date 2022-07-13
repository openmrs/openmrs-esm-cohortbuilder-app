import React from "react";

import { render, fireEvent, waitFor, act } from "@testing-library/react";

import * as apis from "../../cohort-builder.resource";
import SearchByLocation from "./search-by-location.component";

const mockLocations = [
  {
    id: 0,
    label: "Isolation Ward",
    value: "ac7d7773-fe9f-11ec-8b9b-0242ac1b0002",
  },
  {
    id: 1,
    label: "Armani Hospital",
    value: "8d8718c2-c2cc-11de-8d13-0010c6dffd0f",
  },
  {
    id: 2,
    label: "Pharmacy",
    value: "8d871afc-c2cc-11de-8d13-0010c6dffd0f",
  },
  {
    id: 3,
    label: "Outpatient Clinic",
    value: "8d871f2a-c2cc-11de-8d13-0010c6dffd0f",
  },
];

const mockQuery = {
  query: {
    columns: [
      {
        key: "reporting.library.patientDataDefinition.builtIn.preferredName.givenName",
        name: "firstname",
        type: "org.openmrs.module.reporting.data.patient.definition.PatientDataDefinition",
      },
      {
        key: "reporting.library.patientDataDefinition.builtIn.preferredName.familyName",
        name: "lastname",
        type: "org.openmrs.module.reporting.data.patient.definition.PatientDataDefinition",
      },
      {
        key: "reporting.library.patientDataDefinition.builtIn.gender",
        name: "gender",
        type: "org.openmrs.module.reporting.data.patient.definition.PatientDataDefinition",
      },
      {
        key: "reporting.library.patientDataDefinition.builtIn.ageOnDate.fullYears",
        name: "age",
        type: "org.openmrs.module.reporting.data.patient.definition.PatientDataDefinition",
      },
      {
        key: "reporting.library.patientDataDefinition.builtIn.patientId",
        name: "patientId",
        type: "org.openmrs.module.reporting.data.patient.definition.PatientDataDefinition",
      },
    ],
    customRowFilterCombination: "1",
    rowFilters: [
      {
        key: "reporting.library.cohortDefinition.builtIn.encounterSearchAdvanced",
        parameterValues: {
          locationList: [mockLocations[2].value],
          timeQualifier: "LAST",
        },
        type: "org.openmrs.module.reporting.dataset.definition.PatientDataSetDefinition",
      },
    ],
    type: "org.openmrs.module.reporting.dataset.definition.PatientDataSetDefinition",
  },
};

describe("Test the search by location component", () => {
  it("should be able to select input values", async () => {
    jest.spyOn(apis, "fetchLocations").mockResolvedValue(mockLocations);
    const submit = jest.fn();
    const { getByTestId, getByTitle, getByText } = render(
      <SearchByLocation onSubmit={submit} />
    );
    await waitFor(() => expect(jest.spyOn(apis, "fetchLocations")));
    fireEvent.click(getByTitle("Select a location"));
    fireEvent.click(getByText(mockLocations[2].label));
    fireEvent.click(getByTitle("Any Encounter"));
    fireEvent.click(getByText("Most Recent Encounter"));
    fireEvent.click(getByTestId("search-btn"));
    await act(async () => {
      expect(submit).toBeCalledWith(
        mockQuery,
        `Patients in ${mockLocations[2].label} (by method ANY_ENCOUNTER).`
      );
    });
  });
});
