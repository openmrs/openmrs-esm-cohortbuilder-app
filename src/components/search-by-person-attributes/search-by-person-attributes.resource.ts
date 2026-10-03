import { restBaseUrl, useOpenmrsFetchAll } from '@openmrs/esm-framework';
import { type DropdownValue, type Response } from '../../types';

/**
 * @returns PersonAttributes
 */
export function usePersonAttributes() {
  const { data, error, isLoading } = useOpenmrsFetchAll<Response>(`${restBaseUrl}/personattributetype`);

  const personAttributes: DropdownValue[] = (data ?? []).map((personAttribute, index) => ({
    id: index,
    label: personAttribute.display,
    value: personAttribute.uuid,
  }));

  return {
    isLoading,
    personAttributes,
    personAttributesError: error,
  };
}
