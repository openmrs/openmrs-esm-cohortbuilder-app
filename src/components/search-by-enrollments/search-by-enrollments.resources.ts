import { restBaseUrl, useOpenmrsFetchAll } from '@openmrs/esm-framework';
import { type DropdownValue, type Response } from '../../types';

interface ProgramsResponse extends Response {
  name: string;
}

/**
 * @returns Programs
 */
export function usePrograms() {
  const { data, error, isLoading } = useOpenmrsFetchAll<ProgramsResponse>(`${restBaseUrl}/program`);

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
