import React from "react";

import { openmrsFetch } from "@openmrs/esm-framework";
import { render, fireEvent, act } from "@testing-library/react";

import translations from "../../../translations/en.json";
import { useLocations } from "../../cohort-builder.resources";
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
];

const expectedQuery = {
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

const mockOpenmrsFetch = openmrsFetch as jest.Mock;

jest.mock("../../cohort-builder.resources", () => {
  const original = jest.requireActual("../../cohort-builder.resources");
  return {
    ...original,
    useLocations: jest.fn(),
  };
});

describe("Test the search by location component", () => {
  it("should be able to select input values", async () => {
    // @ts-ignore
    useLocations.mockImplementation(() => ({
      locations: mockLocations,
      isLoading: false,
      locationsError: undefined,
    }));
    mockOpenmrsFetch.mockReturnValueOnce({ data: { results: mockLocations } });

    const submit = jest.fn();
    const { getByTestId, getByTitle, getByText } = render(
      <SearchByLocation onSubmit={submit} />
    );

    fireEvent.click(getByText(translations.selectLocations));
    fireEvent.click(getByText(mockLocations[2].label));
    fireEvent.click(getByTitle("Any Encounter"));
    fireEvent.click(getByText("Most Recent Encounter"));
    fireEvent.click(getByTestId("search-btn"));

    await act(async () => {
      expect(submit).toBeCalledWith(
        expectedQuery,
        `Patients in ${mockLocations[2].label} (by method ANY_ENCOUNTER).`
      );
    });
  });
});
