import { restBaseUrl, useOpenmrsFetchAll } from '@openmrs/esm-framework';
import { type DropdownValue, type Response } from '../../types';

interface ProgramsResponse extends Response {
  name: string;
}

/**
 * @returns Programs. Only uuid and name: the default representation converts every program's workflows,
 * and one workflow that fails to convert makes the server answer 400 for the whole list.
 */
export function usePrograms() {
  const { data, error, isLoading } = useOpenmrsFetchAll<ProgramsResponse>(`${restBaseUrl}/program?v=custom:(uuid,name)`, {
    immutable: true,
    swrInfiniteConfig: { revalidateFirstPage: false },
  });

  const programs: DropdownValue[] = (data ?? []).map((program, index) => ({
    id: index,
    label: program.name,
    value: program.uuid,
  }));

  return {
    isLoading,
    programs,
    programsError: error,
  };
}
