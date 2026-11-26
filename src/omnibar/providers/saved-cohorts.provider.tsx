import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { restBaseUrl, useConfig } from '@openmrs/esm-framework';
import { type ConfigObject } from '../../config-schema';
import { savedCohortUrl } from '../cohort-builder-links';
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
 * Saved cohorts by name, from core's `GET /cohort?q=` (case-insensitive "contains"). Each opens in the
 * cohort builder. Core's name search includes voided cohorts, so those are dropped here, and so are
 * cohorts with no name to show.
 */

interface CohortResponse {
  results?: Array<{ uuid: string; name?: string; description?: string; size?: number; voided?: boolean }>;
}

const maxResults = 5;

function toCohortHits(data: unknown): Array<SavedSearchHit> {
  return ((data as CohortResponse)?.results ?? [])
    .filter((cohort) => isPlainObject(cohort) && !cohort.voided && hasVisibleText(cohort.name))
    .map((cohort) => ({
      uuid: cohort.uuid,
      name: cohort.name,
      description: textOrNothing(cohort.description),
      size: cohort.size,
    }))
    .slice(0, maxResults);
}

const SavedCohortsProvider: React.FC<OmnibarProviderProps> = (props) => {
  const { query, report } = props;
  const { t } = useTranslation();
  const { omnibar } = useConfig<ConfigObject>();
  // An id is a patient lookup: no saved search, so nothing appears under the patient while it loads.
  const active = useCohortRowsAllowed(props) && query.length >= Math.max(1, omnibar.savedSearchMinCharacters);
  const url = active
    ? `${restBaseUrl}/cohort?${new URLSearchParams({
        q: query,
        v: 'custom:(uuid,name,description,size,voided)',
        limit: '10',
      })}`
    : null;
  const { hits, loading, error, unavailable } = useSavedSearch(url, toCohortHits);

  useEffect(() => {
    const title = t('omnibarSavedCohorts', 'Saved cohorts');
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
        id: `cohort:${hit.uuid}`,
        title: hit.name,
        subtitle:
          [
            hit.description,
            Number.isInteger(hit.size) &&
              t('cohortMemberCount', {
                count: hit.size,
                defaultValue_one: '{{count}} member',
                defaultValue_other: '{{count}} members',
              }),
          ]
            .filter(Boolean)
            .join(' · ') || t('openInCohortBuilder', 'Open in the Cohort Builder'),
        target: { type: 'navigate', to: savedCohortUrl(hit.uuid) },
      })),
    });
  }, [query, active, hits, loading, error, unavailable, report, t]);

  return null;
};

export default SavedCohortsProvider;
