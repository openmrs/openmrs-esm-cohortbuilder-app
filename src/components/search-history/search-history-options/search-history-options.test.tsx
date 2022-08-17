import React from "react";

import { screen, render, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { Cohort, Query } from "../../../types";
import SearchHistoryOptions from "./search-history-options.component";
import * as apis from "./search-history-options.resources";

jest.mock("./search-history-options.resources");

const searchHistoryItem = {
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
};

const testProps = {
  searchItem: searchHistoryItem,
  updateSearchHistory: jest.fn(),
};

describe("Test the search history options", () => {
  afterEach(cleanup);
  it("should be able to save the search history item as a cohort", async () => {
    const user = userEvent.setup();
    const cohort: Cohort = {
      memberIds: [2, 3],
      description: "Patients with NO Chronic viral hepatitis",
      name: "Chronic viral hepatitis cohort",
      display: "Chronic viral hepatitis cohort",
    };

    render(<SearchHistoryOptions {...testProps} />);

    await user.click(screen.getByTestId("options"));
    await user.click(screen.getByTestId("save-cohort"));
    await user.type(
      screen.getByTestId("cohort-name"),
      "Chronic viral hepatitis cohort"
    );
    await user.click(screen.getByTestId("cohort-save-button"));
    expect(jest.spyOn(apis, "createCohort")).toBeCalledWith(cohort);
  });

  it("should be able to save the search history item as a query", async () => {
    const user = userEvent.setup();
    const query: Query = searchHistoryItem.parameters;
    render(<SearchHistoryOptions {...testProps} />);

    await user.click(screen.getByTestId("options"));
    await user.click(screen.getByTestId("save-query"));
    await user.type(
      screen.getByTestId("query-name"),
      "Chronic viral hepatitis query"
    );
    await user.click(screen.getByTestId("query-save-button"));
    expect(jest.spyOn(apis, "createQuery")).toBeCalledWith(query);
  });

  it("should be able delete search history item", async () => {
    const user = userEvent.setup();
    const updateSearchHistory = jest.fn();
    render(
      <SearchHistoryOptions
        searchItem={searchHistoryItem}
        updateSearchHistory={updateSearchHistory}
      />
    );

    await user.click(screen.getByTestId("options"));
    await user.click(screen.getByTestId("deleteFromHistory"));
    await user.click(screen.getByText("Delete"));
    expect(updateSearchHistory).toBeCalledWith(searchHistoryItem);
  });
});
