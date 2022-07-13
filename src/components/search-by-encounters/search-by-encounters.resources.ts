import { openmrsFetch, FetchResponse } from "@openmrs/esm-framework";

import {
  Form,
  EncounterType,
  FormResponse,
  EncounterTypeResponse,
} from "../../types";

/**
 * @returns Locations
 */
export const fetchForms = async () => {
  const formsResp: FetchResponse<{
    results: FormResponse[];
  }> = await openmrsFetch("/ws/rest/v1/form", {
    method: "GET",
  });

  const {
    data: { results },
  } = formsResp;
  const forms: Form[] = [];
  results.map((form: FormResponse, index: number) => {
    forms.push({
      id: index,
      label: form.display,
      value: form.uuid,
    });
  });

  return forms;
};

/**
 * @returns EncounterTypes
 */
export const fetchEncounterTypes = async () => {
  const encounterTypesResp: FetchResponse<{
    results: EncounterTypeResponse[];
  }> = await openmrsFetch("/ws/rest/v1/encountertype", {
    method: "GET",
  });

  const {
    data: { results },
  } = encounterTypesResp;
  const encounterTypes: EncounterType[] = [];
  results.map((encounterType: EncounterTypeResponse, index: number) => {
    encounterTypes.push({
      id: index,
      label: encounterType.display,
      value: encounterType.uuid,
    });
  });

  return encounterTypes;
};
