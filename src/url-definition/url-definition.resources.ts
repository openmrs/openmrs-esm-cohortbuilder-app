import { openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';
import { type CohortDefinition, isUuid, LinkError } from './url-definition';

/**
 * Looks up display names for the programs, drugs and encounter types in a definition, for history descriptions only.
 * A 404 means the link names something that is gone, so the link is refused. Any other failure is left out and
 * counted in the description instead.
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
        } catch (error) {
          if (isNotFound(error)) {
            throw new LinkError('invalidCohortLink', "This link isn't a valid cohort query");
          }
          // The description falls back to a count.
        }
      }),
  );
  return names;
}

/** openmrsFetch rejects a missing resource with the response still attached. */
function isNotFound(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'response' in error &&
    (error as { response?: { status?: number } }).response?.status === 404
  );
}
