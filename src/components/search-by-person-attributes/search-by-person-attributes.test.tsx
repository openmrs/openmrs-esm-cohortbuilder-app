import React from "react";

import { render, fireEvent, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import SearchByPersonAttributes from "./search-by-person-attributes.component";
import * as apis from "./search-by-person-attributes.resource";

jest.mock("./search-by-person-attributes.resource.ts");

const personAttributes = [
  {
    id: 0,
    label: "email",
    value: "ac7d7773-fe9f-11ec-8b9b-0242ac1b0002",
  },
  {
    id: 1,
    label: "Birthplace",
    value: "8d8718c2-c2cc-11de-8d13-0010c6dffd0f",
  },
  {
    id: 2,
    label: "Citizenship",
    value: "8d871afc-c2cc-11de-8d13-0010c6dffd0f",
  },
  {
    id: 3,
    label: "Civil Status",
    value: "8d871f2a-c2cc-11de-8d13-0010c6dffd0f",
  },
  {
    id: 4,
    label: "Health Center",
    value: "8d87236c-c2cc-11de-8d13-0010c6dffd0f",
  },
  {
    id: 5,
    label: "Health District",
    value: "8d872150-c2cc-11de-8d13-0010c6dffd0f",
  },
  {
    id: 6,
    label: "Mother's Name",
    value: "8d871d18-c2cc-11de-8d13-0010c6dffd0f",
  },
  {
    id: 7,
    label: "Race",
    value: "8d871386-c2cc-11de-8d13-0010c6dffd0f",
  },
  {
    id: 8,
    label: "Telephone Number",
    value: "14d4f066-15f5-102d-96e4-000c29c2a5d7",
  },
  {
    id: 9,
    label: "Unknown patient",
    value: "8b56eac7-5c76-4b9c-8c6f-1deab8d3fc47",
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
        key: "reporting.library.cohortDefinition.builtIn.personWithAttribute",
        parameterValues: {
          attributeType: "8d871d18-c2cc-11de-8d13-0010c6dffd0f",
          values: ["janet", "irina"],
        },
        type: "org.openmrs.module.reporting.dataset.definition.PatientDataSetDefinition",
      },
    ],
    type: "org.openmrs.module.reporting.dataset.definition.PatientDataSetDefinition",
  },
};

describe("Test the search by person attributes component", () => {
  it("should be able to select input values", async () => {
    jest.spyOn(apis, "getPersonAttributes").mockResolvedValue(personAttributes);
    const submit = jest.fn();
    const { getByTestId, getByText } = render(
      <SearchByPersonAttributes onSubmit={submit} />
    );
    await waitFor(() => expect(jest.spyOn(apis, "getPersonAttributes")));
    fireEvent.click(getByText("Open menu"));
    fireEvent.click(getByText("Mother's Name"));
    fireEvent.click(getByTestId("selectedAttributeValues"));
    await userEvent.type(getByTestId("selectedAttributeValues"), "janet,irina");
    fireEvent.click(getByTestId("search-btn"));
    await act(async () => {
      expect(submit).toBeCalledWith(
        mockQuery,
        "Patients with Mother's Name equal to either janet or irina"
      );
    });
  });
});
