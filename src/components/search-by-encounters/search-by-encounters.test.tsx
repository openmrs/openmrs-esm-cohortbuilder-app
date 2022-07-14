import React from "react";

import {
  render,
  cleanup,
  fireEvent,
  waitFor,
  act,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import * as commonApis from "../../cohort-builder.resource";
import SearchByEncounters from "./search-by-encounters.component";
import * as apis from "./search-by-encounters.resources";

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

const mockEncounterTypes = [
  {
    id: 0,
    value: "0cd5d4cb-204e-419a-9dd7-1e18e939ce4c",
    label: "Patient Tracing Form",
  },
  {
    id: 1,
    value: "3044916a-7e5f-478b-9091-803233f27f91",
    label: "Transfer Out",
  },
  {
    id: 2,
    value: "41af1931-184e-45f8-86ca-d42e0db0b8a1",
    label: "Viral Load results",
  },
  {
    id: 3,
    value: "d7151f82-c1f3-4152-a605-2f9ea7414a79",
    label: "Visit Note",
  },
  {
    id: 4,
    value: "67a71486-1a54-468f-ac3e-7091a9a79584",
    label: "Vitals",
  },
];

const mockForms = [
  {
    id: 0,
    value: "bb826dc9-8c1a-4b19-83c9-b59e5e128a7b",
    label: "POC Patient Consent",
  },
  {
    id: 1,
    value: "9326eb32-d0fd-40c3-8c30-69d5774af06d",
    label: "POC Patient Consent v1.2",
  },
  {
    id: 2,
    value: "7f5ce1d4-a42e-4b59-840e-f239d844cf9b",
    label: "POC Test Form",
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
          atLeastCount: "10",
          atMostCount: "20",
          encounterTypeList: ["67a71486-1a54-468f-ac3e-7091a9a79584"],
          formList: ["9326eb32-d0fd-40c3-8c30-69d5774af06d"],
          locationList: ["8d871afc-c2cc-11de-8d13-0010c6dffd0f"],
        },
        type: "org.openmrs.module.reporting.dataset.definition.PatientDataSetDefinition",
      },
    ],
    type: "org.openmrs.module.reporting.dataset.definition.PatientDataSetDefinition",
  },
};

describe("Test the search by encounters component", () => {
  afterEach(cleanup);
  it("should be able to select input values", async () => {
    jest.spyOn(commonApis, "fetchLocations").mockResolvedValue(mockLocations);
    jest.spyOn(apis, "fetchForms").mockResolvedValue(mockForms);
    jest
      .spyOn(apis, "fetchEncounterTypes")
      .mockResolvedValue(mockEncounterTypes);
    const submit = jest.fn();
    const { getByTestId, getByTitle, getByText } = render(
      <SearchByEncounters onSubmit={submit} />
    );
    await waitFor(() => {
      expect(jest.spyOn(commonApis, "fetchLocations"));
      expect(jest.spyOn(apis, "fetchForms"));
      expect(jest.spyOn(apis, "fetchEncounterTypes"));
    });

    fireEvent.click(getByText("Select an encounter type"));
    fireEvent.click(getByText(mockEncounterTypes[4].label));
    fireEvent.click(getByTitle("Select a form"));
    fireEvent.click(getByText(mockForms[1].label));
    fireEvent.click(getByTitle("Select a location"));
    fireEvent.click(getByText(mockLocations[2].label));

    const atLeastCountInput = getByTestId("atLeastCount");
    const atMostCountInput = getByTestId("atMostCount");
    fireEvent.click(atLeastCountInput);
    await userEvent.type(atLeastCountInput, "10");
    fireEvent.click(atMostCountInput);
    await userEvent.type(atMostCountInput, "20");

    fireEvent.click(getByTestId("search-btn"));
    await act(async () => {
      expect(submit).toBeCalledWith(
        mockQuery,
        `Patients with Encounter of Types ${mockEncounterTypes[4].label} at ${mockLocations[2].label} from ${mockForms[1].label} at least 10 times  and at most 20 times`
      );
    });
  });
});
