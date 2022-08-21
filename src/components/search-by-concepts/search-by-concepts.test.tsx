import React from "react";

import { render, cleanup, waitFor, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import dayjs from "dayjs";

import { Concept } from "../../types";
import SearchByConcepts from "./search-by-concepts.component";
import * as apis from "./search-concept/search-concept.resource";

jest.mock("./search-concept/search-concept.resource.ts");

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
        key: "reporting.library.cohortDefinition.builtIn.numericObsSearchAdvanced",
        parameterValues: {
          onOrBefore: "",
          operator1: "LESS_THAN",
          question: "2a08da66-f326-4cac-b4cc-6efd68333847",
          timeModifier: "ANY",
        },
        type: "org.openmrs.module.reporting.dataset.definition.PatientDataSetDefinition",
      },
    ],
    customRowFilterCombination: "1",
  },
};
const concepts: Concept[] = [
  {
    uuid: "1000AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
    units: "",
    answers: [],
    hl7Abbrev: "ZZ",
    name: "Whole blood sample",
    description: "Blood samples not seperated into subtypes",
    datatype: {
      uuid: "8d4a4c94-c2cc-11de-8d13-0010c6dffd0f",
      name: "N/A",
      description: "Not associated with a datatype (e.g., term answers, sets)",
      hl7Abbreviation: "ZZ",
    },
  },
  {
    uuid: "2a08da66-f326-4cac-b4cc-6efd68333847",
    units: "mg/dl",
    answers: [],
    hl7Abbrev: "NM",
    name: "BLOOD SUGAR",
    description: "Laboratory measurement of the glucose level in the blood.",
    datatype: {
      uuid: "8d4a4488-c2cc-11de-8d13-0010c6dffd0f",
      name: "Numeric",
      description:
        "Numeric value, including integer or float (e.g., creatinine, weight)",
      hl7Abbreviation: "NM",
    },
  },
];

describe("Test the search by concept component", () => {
  afterEach(cleanup);

  it("should be able to select input values", async () => {
    const user = userEvent.setup();
    jest.spyOn(apis, "getConcepts").mockResolvedValue(concepts);
    const submit = jest.fn();
    render(<SearchByConcepts onSubmit={submit} />);
    const searchInput = screen.getByPlaceholderText("Search Concepts");
    const lastDaysInput = screen.getByTestId("last-days");
    const lastMonthsInput = screen.getByTestId("last-months");

    await waitFor(() => user.click(searchInput));
    await waitFor(() => user.type(searchInput, "blood sugar"));
    await waitFor(() =>
      expect(jest.spyOn(apis, "getConcepts")).toBeCalledWith("blood sugar")
    );

    await waitFor(() => user.click(screen.getByText("BLOOD SUGAR")));
    await waitFor(() => user.click(lastDaysInput));
    await waitFor(() => user.clear(lastDaysInput));
    await waitFor(() => user.type(lastDaysInput, "15"));
    await waitFor(() => user.click(lastMonthsInput));
    await waitFor(() => user.clear(lastMonthsInput));
    await waitFor(() => user.type(lastMonthsInput, "4"));
    await waitFor(() => user.click(screen.getByText("Any")));

    const date = dayjs().subtract(15, "days").subtract(4, "months");
    expectedQuery.query.rowFilters[0].parameterValues.onOrBefore =
      date.format();
    await waitFor(() => user.click(screen.getByTestId("search-btn")));

    await waitFor(() => {
      expect(submit).toBeCalledWith(
        expectedQuery,
        "Patients with ANY BLOOD SUGAR  until " + date.format("D/M/YYYY")
      );
    });
  });
});
