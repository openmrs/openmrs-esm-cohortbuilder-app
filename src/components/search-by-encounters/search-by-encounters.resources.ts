import { openmrsFetch, FetchResponse } from "@openmrs/esm-framework";

import { DropdownValue, Response } from "../../types";

/**
 * @returns Locations
 */
export const fetchForms = async () => {
  const formsResp: FetchResponse<{
    results: Response[];
  }> = await openmrsFetch("/ws/rest/v1/form", {
    method: "GET",
  });

  const {
    data: { results },
  } = formsResp;
  const forms: DropdownValue[] = [];
  results.map((form: Response, index: number) => {
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
    results: Response[];
  }> = await openmrsFetch("/ws/rest/v1/encountertype", {
    method: "GET",
  });

  const {
    data: { results },
  } = encounterTypesResp;
  const encounterTypes: DropdownValue[] = [];
  results.map((encounterType: Response, index: number) => {
    encounterTypes.push({
      id: index,
      label: encounterType.display,
      value: encounterType.uuid,
    });
  });

  return encounterTypes;
};
