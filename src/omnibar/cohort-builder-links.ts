import { type CohortDefinition, encodeDefinition } from '../url-definition/url-definition';

/** The builder's page. `interpolateUrl` trims the base's trailing slash, so the path brings its own. */
export const cohortBuilderPath = '${openmrsSpaBase}/cohort-builder';

/** Null when the builder would refuse the definition. */
export function definitionUrl(definition: CohortDefinition): string | null {
  const encoded = encodeDefinition(definition);
  return encoded === null ? null : `${cohortBuilderPath}?definition=${encoded}`;
}

export function savedCohortUrl(uuid: string): string {
  return `${cohortBuilderPath}?cohort=${encodeURIComponent(uuid)}`;
}

export function savedQueryUrl(uuid: string): string {
  return `${cohortBuilderPath}?query=${encodeURIComponent(uuid)}`;
}
