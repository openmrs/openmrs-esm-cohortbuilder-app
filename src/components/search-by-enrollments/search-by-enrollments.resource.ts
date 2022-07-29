import { openmrsFetch } from "@openmrs/esm-framework";
import useSWRImmutable from "swr/immutable";

import { DropdownValue, Response } from "../../types";

interface ProgramsResponse extends Response {
  name: string;
}

/**
 * @returns Programs
 */
export function usePrograms() {
  const { data, error } = useSWRImmutable<{
    data: { results: ProgramsResponse[] };
  }>("/ws/rest/v1/program", openmrsFetch);

  const programs: DropdownValue[] = [];
  data?.data.results.map((program: ProgramsResponse, index: number) => {
    programs.push({
      id: index,
      label: program.name,
      value: program.uuid,
    });
  });
  return {
    isLoading: !data && !error,
    programs,
    programsError: error,
  };
}
