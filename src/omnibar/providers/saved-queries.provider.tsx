import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { restBaseUrl, useConfig } from '@openmrs/esm-framework';
import { type ConfigObject } from '../../config-schema';
import { savedQueryUrl } from '../cohort-builder-links';
import { type OmnibarProviderProps } from '../omnibar-contract';
import {
  hasVisibleText,
  isPlainObject,
  type SavedSearchHit,
  textOrNothing,
  useSavedSearch,
} from '../saved-search.resource';
import { useCohortRowsAllowed } from '../use-cohort-rows-allowed';

/**
 * Saved cohort builder queries by name. The cohort builder stores them as data set definitions named
 * "[AdHocDataExport] <name>", among every report's data set definitions. `dataSetDefinition?q=` is a
 * literal, case-insensitive "contains", so asking for the prefix lists only the saved queries; the
 * typed text is then matched here against the name without its prefix. One list serves every
 * keystroke until the search cache expires.
 */

interface DataSetDefinitionResponse {
  results?: Array<{ uuid: string; name?: string; description?: string }>;
}

const adHocPrefix = '[AdHocDataExport]';
const maxResults = 5;
const maxSavedQueries = 100;

/** Saved queries whose name is only the prefix have nothing to show, so they are dropped. */
export function toQueryHits(data: unknown): Array<SavedSearchHit> {
  return ((data as DataSetDefinitionResponse)?.results ?? [])
    .filter((definition) => isPlainObject(definition) && typeof definition.name === 'string')
    .filter((definition) => definition.name.startsWith(adHocPrefix))
    .map((definition) => ({
      uuid: definition.uuid,
      name: definition.name.slice(adHocPrefix.length).trim(),
      description: textOrNothing(definition.description),
    }))
    .filter((hit) => hasVisibleText(hit.name));
}

const SavedQueriesProvider: React.FC<OmnibarProviderProps> = (props) => {
  const { query, report } = props;
  const { t } = useTranslation();
  const { omnibar } = useConfig<ConfigObject>();
  // An id is a patient lookup: no saved search, so nothing appears under the patient while it loads.
  const active = useCohortRowsAllowed(props) && query.length >= Math.max(1, omnibar.savedSearchMinCharacters);
  const url = active
    ? `${restBaseUrl}/reportingrest/dataSetDefinition?${new URLSearchParams({
        q: adHocPrefix,
        v: 'custom:(uuid,name,description)',
        limit: String(maxSavedQueries),
      })}`
    : null;
  const { hits: savedQueries, loading, error, unavailable } = useSavedSearch(url, toQueryHits);
  const hits = useMemo(() => {
    const typed = query.toLowerCase();
    return savedQueries.filter((hit) => hit.name.toLowerCase().includes(typed)).slice(0, maxResults);
  }, [savedQueries, query]);

  useEffect(() => {
    const title = t('omnibarSavedQueries', 'Saved queries');
    if (!active) {
      report({ query, title, status: 'idle' });
      return;
    }
    if (error) {
      report({ query, title, status: 'error', ...(unavailable && { detail: { state: 'unavailable' } }) });
      return;
    }
    report({
      query,
      title,
      status: loading ? 'loading' : 'ready',
      results: hits.map((hit) => ({
        id: `query:${hit.uuid}`,
        title: hit.name,
        subtitle: hit.description || t('runInCohortBuilder', 'Run in the Cohort Builder'),
        target: { type: 'navigate', to: savedQueryUrl(hit.uuid) },
      })),
    });
  }, [query, active, hits, loading, error, unavailable, report, t]);

  return null;
};

export default SavedQueriesProvider;
