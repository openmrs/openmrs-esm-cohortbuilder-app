import React from "react";

import { render, cleanup, fireEvent, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { SearchHistory } from "./search-history.component";
import * as apis from "./search-history.resources";
import * as utils from "./search-history.utils";

jest.mock("./search-history.utils.ts");
jest.mock("./search-history.resources");

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
    const { getByText } = render(
      <SearchHistory isHistoryUpdated={false} setIsHistoryUpdated={jest.fn()} />
    );
    expect(getByText("There are no history to display")).toBeInTheDocument();
  });

  it("should display the search history", () => {
    jest.spyOn(utils, "getSearchHistory").mockReturnValue(mockSearchHistory);
    const { getByText } = render(
      <SearchHistory isHistoryUpdated={true} setIsHistoryUpdated={jest.fn()} />
    );
    expect(getByText("Clear Search History")).toBeInTheDocument();
    expect(getByText("2")).toBeInTheDocument();
    expect(
      getByText("Patients with NO Chronic viral hepatitis")
    ).toBeInTheDocument();
  });

  it("should be able to save the search history item as a cohort", async () => {
    jest.spyOn(utils, "getSearchHistory").mockReturnValue(mockSearchHistory);
    const { getByTestId } = render(
      <SearchHistory isHistoryUpdated={true} setIsHistoryUpdated={jest.fn()} />
    );

    fireEvent.click(getByTestId("options"));
    fireEvent.click(getByTestId("save-cohort"));
    await userEvent.type(
      getByTestId("cohort-name"),
      "Chronic viral hepatitis cohort"
    );
    await act(async () => {
      fireEvent.click(getByTestId("cohort-save-button"));
    });
    expect(jest.spyOn(apis, "createCohort")).toBeCalled();
  });

  it("should be able to save the search history item as a query", async () => {
    jest.spyOn(utils, "getSearchHistory").mockReturnValue(mockSearchHistory);
    const { getByTestId } = render(
      <SearchHistory isHistoryUpdated={true} setIsHistoryUpdated={jest.fn()} />
    );

    fireEvent.click(getByTestId("options"));
    fireEvent.click(getByTestId("save-query"));
    await userEvent.type(
      getByTestId("query-name"),
      "Chronic viral hepatitis query"
    );
    await act(async () => {
      fireEvent.click(getByTestId("query-save-button"));
    });
    expect(jest.spyOn(apis, "createQuery")).toBeCalled();
  });

  it("should be able delete search history item", async () => {
    jest.spyOn(utils, "getSearchHistory").mockReturnValue(mockSearchHistory);
    const { getByText, getByTestId } = render(
      <SearchHistory isHistoryUpdated={true} setIsHistoryUpdated={jest.fn()} />
    );

    fireEvent.click(getByTestId("options"));
    fireEvent.click(getByText("Delete from history"));
    fireEvent.click(getByText("Delete"));
    expect(getByText("There are no history to display")).toBeInTheDocument();
  });
});
