import React from "react";

import {
  render,
  cleanup,
  fireEvent,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import Composition from "./composition.component";
import * as utils from "./composition.utils";

const mockCompositionQuery = {
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
        key: "reporting.library.cohortDefinition.builtIn.codedObsSearchAdvanced",
        parameterValues: {
          operator1: "LESS_THAN",
          question: "163126AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
          timeModifier: "NO",
        },
        type: "org.openmrs.module.reporting.dataset.definition.PatientDataSetDefinition",
      },
      {
        key: "reporting.library.cohortDefinition.builtIn.encounterSearchAdvanced",
        parameterValues: {
          locationList: [
            "1ce1b7d4-c865-4178-82b0-5932e51503d6",
            "ba685651-ed3b-4e63-9b35-78893060758a",
            "44c3efb0-2583-4c80-a79e-1f756a03c0a1",
          ],
          timeQualifier: "ANY",
        },
        type: "org.openmrs.module.reporting.dataset.definition.PatientDataSetDefinition",
      },
    ],
    customRowFilterCombination: "(1) and (2)",
  },
};

describe("Test the composition component", () => {
  afterEach(cleanup);
  it("should be throw an error when an invalid composition query is entered", async () => {
    const submit = jest.fn();
    render(<Composition onSubmit={submit} />);

    const searchInput = screen.getByTestId("composition-query");
    fireEvent.click(searchInput);
    await userEvent.type(searchInput, "random text");

    fireEvent.click(screen.getByTestId("search-btn"));
    await waitFor(() => expect(submit).not.toBeCalled());
  });

  it("should be to search a composition query", async () => {
    const submit = jest.fn();
    const compositionQuery = "1 and 2";

    jest
      .spyOn(utils, "createCompositionQuery")
      .mockReturnValue(mockCompositionQuery);
    render(<Composition onSubmit={submit} />);

    const compositionInput = screen.getByTestId("composition-query");
    fireEvent.click(compositionInput);
    await userEvent.type(compositionInput, compositionQuery);

    fireEvent.click(screen.getByTestId("search-btn"));
    await waitFor(() => {
      expect(submit).toBeCalledWith(
        mockCompositionQuery,
        "Composition of 1 and 2"
      );
    });
  });
});
