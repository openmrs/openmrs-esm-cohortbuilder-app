import { restBaseUrl, useOpenmrsFetchAll } from '@openmrs/esm-framework';
import type { DropdownValue, Response } from '../../types';

/**
 * @returns Forms
 */
export const useForms = () => {
  const { data, error, isLoading } = useOpenmrsFetchAll<Response>(`${restBaseUrl}/form`, { immutable: true });

  const forms: DropdownValue[] = (data ?? []).map((form, index) => ({
    id: index,
    label: form.display,
    value: form.uuid,
  }));

  return {
    isLoading,
    forms,
    formsError: error,
  };
};

/**
 * @returns EncounterTypes
 */
export const useEncounterTypes = () => {
  const { data, error, isLoading } = useOpenmrsFetchAll<Response>(`${restBaseUrl}/encountertype`, { immutable: true });

  const encounterTypes: DropdownValue[] = (data ?? []).map((encounterType, index) => ({
    id: index,
    label: encounterType.display,
    value: encounterType.uuid,
  }));

  return {
    isLoading,
    encounterTypes,
    encounterTypesError: error,
  };
};
