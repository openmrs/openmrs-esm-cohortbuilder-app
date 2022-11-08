import React from "react";

import { render, cleanup, screen } from "@testing-library/react";

import translations from "../../../translations/en.json";
import SearchHistory from "./search-history.component";
import * as utils from "./search-history.utils";

jest.mock("./search-history.utils.ts");

const mockSearchHistory = [
  {
    description: "Patients with NO Chronic viral hepatitis",
    patients: [
      {
        firstname: "Horatio",
        gender: "M",
        patientId: 2,
        age: 81,
        lastname: "Hornblower",
        id: "2",
        name: "Horatio Hornblower",
      },
      {
        firstname: "John",
        gender: "M",
        patientId: 3,
        age: 47,
        lastname: "Patient",
        id: "3",
        name: "John Patient",
      },
    ],
    parameters: {
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
          key: "reporting.library.cohortDefinition.builtIn.codedObsSearchAdvanced",
          parameterValues: {
            operator1: "LESS_THAN",
            question: "145131AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
            timeModifier: "NO",
          },
          type: "org.openmrs.module.reporting.dataset.definition.PatientDataSetDefinition",
        },
      ],
      customRowFilterCombination: "1",
    },
    id: "1",
    results: "2",
  },
];

describe("Test the search history component", () => {
  afterEach(cleanup);
  it("should render a message when there's no history to display", async () => {
    render(
      <SearchHistory isHistoryUpdated={false} setIsHistoryUpdated={jest.fn()} />
    );

    expect(
      screen.getByText("There are no data to display")
    ).toBeInTheDocument();
  });

  it("should display the search history", async () => {
    jest.spyOn(utils, "getSearchHistory").mockReturnValue(mockSearchHistory);

    render(
      <SearchHistory isHistoryUpdated={true} setIsHistoryUpdated={jest.fn()} />
    );

    expect(screen.getByText(translations.clearHistory)).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(
      screen.getByText(mockSearchHistory[0].description)
    ).toBeInTheDocument();
  });
});
