import { useMemo } from 'react';
import { restBaseUrl, useOpenmrsFetchAll } from '@openmrs/esm-framework';
import type { DropdownValue, Response } from '../../types';

/**
 * @returns Drugs
 */
export function useDrugs() {
  const { data, error, isLoading } = useOpenmrsFetchAll<Response>(`${restBaseUrl}/drug`, { immutable: true });

  const results = useMemo(() => {
    const drugs: DropdownValue[] = (data ?? []).map((drug, index) => ({
      id: index,
      label: drug.display,
      value: drug.uuid,
    }));
    return {
      isLoading,
      drugs,
      drugsError: error,
    };
  }, [data, error, isLoading]);

  return results;
}

/**
 * @returns CareSettings
 */
export function useCareSettings() {
  const { data, error, isLoading } = useOpenmrsFetchAll<Response>(`${restBaseUrl}/caresetting`, { immutable: true });

  const results = useMemo(() => {
    const careSettings: DropdownValue[] = (data ?? []).map((careSetting, index) => ({
      id: index,
      label: careSetting.display,
      value: careSetting.uuid,
    }));
    return {
      isLoading,
      careSettings,
      careSettingsError: error,
    };
  }, [data, error, isLoading]);

  return results;
}
