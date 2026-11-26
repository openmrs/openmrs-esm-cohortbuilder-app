import { useConfig } from '@openmrs/esm-framework';
import { type ConfigObject } from '../config-schema';
import { looksLikeIdentifier, type OmnibarProviderProps } from './omnibar-contract';

/**
 * Whether a cohort row may answer this query at all: the rows are turned on, the bar is outside a
 * chart, and the text isn't shaped like a patient identifier, which is patient search's alone. A host
 * from before contract 1 passes no hints, so the provider then works the shape out itself.
 */
export function useCohortRowsAllowed({ query, context, hints }: OmnibarProviderProps): boolean {
  const { omnibar } = useConfig<ConfigObject>();
  return omnibar.enabled && context.scope === 'global' && !(hints?.looksLikeIdentifier ?? looksLikeIdentifier(query));
}
