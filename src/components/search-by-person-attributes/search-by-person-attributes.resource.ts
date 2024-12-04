import useSWRImmutable from 'swr/immutable';
import { openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';
import { type DropdownValue, type Response } from '../../types';

/**
 * @returns PersonAttributes
 */
export function usePersonAttributes() {
  const { data, error } = useSWRImmutable<{
    data: { results: Response[] };
  }>(`${restBaseUrl}/personattributetype`, openmrsFetch);

  const personAttributes: DropdownValue[] = [];
  data?.data.results.map((personAttribute: Response, index: number) => {
    personAttributes.push({
      id: index,
      label: personAttribute.display,
      value: personAttribute.uuid,
    });
  });
  return {
    isLoading: !data && !error,
    personAttributes,
    personAttributesError: error,
  };
}
