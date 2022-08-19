import React from "react";

import { render, fireEvent, act } from "@testing-library/react";

import translations from "../../../translations/en.json";
import SearchByDrugOrder from "./search-by-drug-orders.component";
import * as apis from "./search-by-drug-orders.resource";

const mockCareSettings = [
  {
    id: 0,
    label: "Isolation Ward",
    value: "ac7d7773-fe9f-11ec-8b9b-0242ac1b1102",
  },
  {
    id: 1,
    label: "Armani Hospital",
    value: "8d8718c2-c2cc-11de-8d13-0010c6effd0f",
  },
  {
    id: 2,
    label: "Pharmacy",
    value: "8d871afc-c2cc-11de-8d13-0010c6dffd0f",
  },
];

const mockDrugs = [
  {
    id: 0,
    label: "Triomune-40",
    value: "ac7d7773-fe9f-11ec-8b9b-0242ac1b0402",
  },
  {
    id: 1,
    label: "Valium",
    value: "8d8718c2-c2cc-11de-8d13-0010c6dffd0f",
  },
  {
    id: 2,
    label: "Aspirin",
    value: "9d971afc-c2cc-11de-8d13-0010c6dffd0f",
  },
];

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
        key: "reporting.library.cohortDefinition.builtIn.drugOrderSearch",
        parameterValues: {
          careSetting: mockCareSettings[2].value,
          drugs: [mockDrugs[0].value, mockDrugs[1].value],
        },
        type: "org.openmrs.module.reporting.dataset.definition.PatientDataSetDefinition",
      },
    ],
    customRowFilterCombination: "1",
  },
};

describe("Test the search by drug orders component", () => {
  xit("should be able to select input values", async () => {
    jest.spyOn(apis, "useDrugs").mockReturnValue({
      drugs: mockDrugs,
      isLoading: false,
      drugsError: undefined,
    });
    jest.spyOn(apis, "useCareSettings").mockReturnValue({
      careSettings: mockCareSettings,
      isLoading: false,
      careSettingsError: undefined,
    });
    const submit = jest.fn();
    const { getByTestId, getByTitle, getByText } = render(
      <SearchByDrugOrder onSubmit={submit} />
    );

    act(() => {
      fireEvent.click(getByText(translations.selectDrugs));
    });

    act(() => {
      fireEvent.click(getByText(mockDrugs[1].label));
    });

    act(() => {
      fireEvent.click(getByText(mockDrugs[2].label));
    });

    act(() => {
      fireEvent.click(getByTitle(mockCareSettings[0].label));
    });

    act(() => {
      fireEvent.click(getByText(mockCareSettings[2].label));
    });

    act(() => {
      fireEvent.click(getByTestId("search-btn"));
    });

    await act(async () => {
      expect(submit).toBeCalledWith(
        expectedQuery,
        `Patients who taking ${mockDrugs[1].label} and ${mockDrugs[2].label} from Pharmacy`
      );
    });
  });
});
