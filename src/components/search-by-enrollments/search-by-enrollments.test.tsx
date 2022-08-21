import React from "react";

import { openmrsFetch } from "@openmrs/esm-framework";
import { render, fireEvent, act } from "@testing-library/react";

import translations from "../../../translations/en.json";
import { useLocations } from "../../cohort-builder.resources";
import SearchByEnrollments from "./search-by-enrollments.component";
import { usePrograms } from "./search-by-enrollments.resources";

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

const mockPrograms = [
  {
    id: 0,
    value: "64f950e6-1b07-4ac0-8e7e-f3e148f3463f",
    label: "HIV Care and Treatment",
  },
  {
    id: 1,
    value: "ac1bbc45-8c35-49ff-a574-9553ff789527",
    label: "HIV Preventative Services (PEP/PrEP)",
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
        key: "reporting.library.cohortDefinition.builtIn.patientsWithEnrollment",
        parameterValues: {
          programs: [mockPrograms[0].value],
          locationList: [mockLocations[2].value],
        },
        type: "org.openmrs.module.reporting.dataset.definition.PatientDataSetDefinition",
      },
    ],
    type: "org.openmrs.module.reporting.dataset.definition.PatientDataSetDefinition",
  },
};

const mockOpenmrsFetch = openmrsFetch as jest.Mock;

jest.mock("./search-by-enrollments.resources", () => {
  const original = jest.requireActual("./search-by-enrollments.resources");
  return {
    ...original,
    usePrograms: jest.fn(),
  };
});

jest.mock("../../cohort-builder.resources", () => {
  const original = jest.requireActual("../../cohort-builder.resources");
  return {
    ...original,
    useLocations: jest.fn(),
  };
});

describe("Test the search by enrollments component", () => {
  it("should be able to select input values", async () => {
    // @ts-ignore
    useLocations.mockImplementation(() => ({
      locations: mockLocations,
      isLoading: false,
      locationsError: undefined,
    }));
    mockOpenmrsFetch.mockReturnValueOnce({
      data: { results: mockLocations },
    });

    // @ts-ignore
    usePrograms.mockImplementation(() => ({
      encounterTypes: mockPrograms,
      isLoading: false,
      programsError: undefined,
    }));
    mockOpenmrsFetch.mockReturnValueOnce({
      data: { results: mockPrograms },
    });

    const submit = jest.fn();
    const { getByTestId, getByText } = render(
      <SearchByEnrollments onSubmit={submit} />
    );

    act(() => {
      fireEvent.click(getByText(translations.selectLocations));
    });
    act(() => {
      fireEvent.click(getByText(mockLocations[2].label));
    });
    act(() => {
      fireEvent.click(getByText(translations.selectPrograms));
    });
    act(() => {
      fireEvent.click(getByText(mockPrograms[0].label));
    });
    act(() => {
      fireEvent.click(getByTestId("search-btn"));
    });

    await act(async () => {
      expect(submit).toBeCalledWith(
        expectedQuery,
        `Patients enrolled in ${mockPrograms[0].label} at ${mockLocations[2].label}`
      );
    });
  });
});
