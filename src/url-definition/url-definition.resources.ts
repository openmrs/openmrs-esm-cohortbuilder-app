import { openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';
import { type CohortDefinition, isUuid, type TestDetails } from './url-definition';

/**
 * Looks up display names for the programs, drugs and encounter types in a definition, for history descriptions only.
 * Best effort: anything that fails to load is left out and counted in the description instead.
 */
export async function fetchDisplayNames(definition: CohortDefinition): Promise<Map<string, string>> {
  const lookups: Array<[resource: string, uuid: string]> = definition.criteria.flatMap((criterion) => {
    switch (criterion.type) {
      case 'enrollment':
        return criterion.programs.map((uuid) => ['program', uuid] as [string, string]);
      case 'drugOrder':
        return criterion.drugs.map((uuid) => ['drug', uuid] as [string, string]);
      case 'encounter':
        return criterion.encounterTypes.map((uuid) => ['encountertype', uuid] as [string, string]);
      default:
        return [];
    }
  });

  const names = new Map<string, string>();
  await Promise.all(
    lookups
      // Already validated, but checked again right where the uuid goes into a URL path.
      .filter(([, uuid]) => isUuid(uuid))
      .map(async ([resource, uuid]) => {
        try {
          const { data } = await openmrsFetch<{ display: string }>(
            `${restBaseUrl}/${resource}/${uuid}?v=custom:(display)`,
          );
          if (typeof data?.display === 'string') {
            names.set(uuid, data.display);
          }
        } catch {
          // The description falls back to a count.
        }
      }),
  );
  return names;
}

/**
 * The name, units and datatype of each test result's concept in a definition. A concept that can't
 * be loaded is left out, and the link then refuses to run.
 */
export async function fetchTestDetails(definition: CohortDefinition): Promise<TestDetails> {
  const uuids = [
    ...new Set(
      definition.criteria.flatMap((criterion) => (criterion.type === 'numericObs' ? [criterion.concept] : [])),
    ),
  ];
  const tests: TestDetails = new Map();
  await Promise.all(
    uuids
      .filter((uuid) => isUuid(uuid))
      .map(async (uuid) => {
        try {
          const { data } = await openmrsFetch<{
            display?: unknown;
            units?: unknown;
            datatype?: { hl7Abbreviation?: unknown };
          }>(`${restBaseUrl}/concept/${uuid}?v=custom:(display,units,datatype:(hl7Abbreviation))`);
          if (typeof data?.display === 'string' && typeof data.datatype?.hl7Abbreviation === 'string') {
            tests.set(uuid, {
              name: data.display,
              units: typeof data.units === 'string' ? data.units : '',
              hl7Abbrev: data.datatype.hl7Abbreviation,
            });
          }
        } catch {
          // Left out, so the link refuses to run.
        }
      }),
  );
  return tests;
}
