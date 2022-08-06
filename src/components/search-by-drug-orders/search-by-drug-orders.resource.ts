import { openmrsFetch } from "@openmrs/esm-framework";
import useSWRImmutable from "swr/immutable";

import { DropdownValue, Response } from "../../types";

/**
 * @returns Drugs
 */
export function useDrugs() {
  const { data, error } = useSWRImmutable<{
    data: { results: Response[] };
  }>("/ws/rest/v1/drug", openmrsFetch);

  const drugs: DropdownValue[] = [];
  data?.data.results.map((drug: Response, index: number) => {
    drugs.push({
      id: index,
      label: drug.display,
      value: drug.uuid,
    });
  });
  return {
    isLoading: !data && !error,
    drugs,
    drugsError: error,
  };
}

/**
 * @returns CareSettings
 */
export function useCareSettings() {
  const { data, error } = useSWRImmutable<{
    data: { results: Response[] };
  }>("/ws/rest/v1/caresetting", openmrsFetch);

  const careSettings: DropdownValue[] = [];
  data?.data.results.map((careSetting: Response, index: number) => {
    careSettings.push({
      id: index,
      label: careSetting.display,
      value: careSetting.uuid,
    });
  });
  return {
    isLoading: !data && !error,
    careSettings,
    careSettingsError: error,
  };
}
