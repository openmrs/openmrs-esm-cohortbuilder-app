import { useEffect, useMemo } from 'react';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import { useConfig } from '@openmrs/esm-framework';
import { type ConfigObject } from '../../config-schema';
import { type CohortDefinition, definitionSearch } from '../../url-definition/url-definition';
import { definitionUrl } from '../cohort-builder-links';
import { useCohortCount } from '../cohort-count.resource';
import { type OmnibarProviderProps } from '../omnibar-contract';
import { type CohortCriteriaConfig, cohortCriteriaConfig, parseCohortCriteria } from '../parse-cohort-criteria';
import { useCohortRowsAllowed } from '../use-cohort-rows-allowed';

/**
 * One row with the number of patients, when the whole query parses into a cohort definition: "how many
 * women aged 15-49" shows the count, with what was counted in the builder's own words, and opens the
 * Cohort Builder pre-filled with the same definition, where the patients are listed. Parsing needs no
 * network; the count is asked for once the definition has stayed the same for `countDebounceMs`.
 */

/**
 * Seam for an AI parser of queries the deterministic one can't read. Deliberately not implemented
 * and not wired. Per the omnibar rules a model never runs on its own: an AI parser may only run
 * after the user picks an explicit row that says it asks AI, never per keystroke and never as a
 * silent fallback for a query that failed to parse.
 */
export interface CohortCriteriaFallbackParser {
  parse(text: string, config: CohortCriteriaConfig, signal: AbortSignal): Promise<CohortDefinition | null>;
}

/** The configured names for the uuids a definition holds, as the builder's descriptions use them. */
function configuredNames({ programs, encounterTypes }: CohortCriteriaConfig): Map<string, string> {
  return new Map([...(programs ?? []), ...(encounterTypes ?? [])].map(({ uuid, label }) => [uuid, label]));
}

/** The count in the host's locale, such as "1,204"; plain digits for a locale the browser doesn't know. */
function formatCount(count: number, locale: string): string {
  try {
    return new Intl.NumberFormat(locale.replace(/_/g, '-')).format(count);
  } catch {
    return String(count);
  }
}

const CohortCountProvider: React.FC<OmnibarProviderProps> = (props) => {
  const { query, context, report } = props;
  const { t } = useTranslation();
  const config = useConfig<ConfigObject>();
  const allowed = useCohortRowsAllowed(props);
  const criteriaConfig = useMemo(() => cohortCriteriaConfig(config), [config]);
  const { drugOrderSearchDefinitionKey } = config;

  const offer = useMemo(() => {
    const definition = allowed ? parseCohortCriteria(query, criteriaConfig) : null;
    const to = definition ? definitionUrl(definition) : null;
    if (!to) {
      return null;
    }
    const { searchParams, description } = definitionSearch(
      definition,
      configuredNames(criteriaConfig),
      drugOrderSearchDefinitionKey,
    );
    // The link stands for the definition. The day is in the key because ages and "today" move with it.
    return { to, description, query: searchParams.query, key: `${dayjs().format('YYYY-MM-DD')} ${to}` };
  }, [allowed, query, criteriaConfig, drugOrderSearchDefinitionKey]);

  const { count, loading, error, unavailable } = useCohortCount(
    offer?.key ?? null,
    offer?.query ?? null,
    config.omnibar.countDebounceMs,
  );

  useEffect(() => {
    const title = t('omnibarCohortCount', 'Patient count');
    if (!offer) {
      report({ query, title, status: 'idle' });
      return;
    }
    if (error) {
      report({ query, title, status: 'error', ...(unavailable && { detail: { state: 'unavailable' } }) });
      return;
    }
    const counted = !loading && count !== undefined;
    report({
      query,
      title,
      status: counted ? 'ready' : 'loading',
      results: [
        {
          id: 'cohort-count',
          title: counted
            ? t('omnibarCohortCountPatients', {
                count,
                formattedCount: formatCount(count, context.locale ?? 'en'),
                defaultValue_one: '{{formattedCount}} patient',
                defaultValue_other: '{{formattedCount}} patients',
              })
            : t('omnibarCounting', 'Counting…'),
          // Built from config labels and the builder's own words. Text for React to escape, never HTML.
          subtitle: offer.description,
          target: { type: 'navigate', to: offer.to },
        },
      ],
    });
  }, [query, offer, count, loading, error, unavailable, context.locale, report, t]);

  return null;
};

export default CohortCountProvider;
