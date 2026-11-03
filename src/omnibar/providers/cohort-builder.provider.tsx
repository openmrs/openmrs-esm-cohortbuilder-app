import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { cohortBuilderPath } from '../cohort-builder-links';
import { type OmnibarProviderProps } from '../omnibar-contract';
import { useCohortRowsAllowed } from '../use-cohort-rows-allowed';

/**
 * A "Cohort Builder" row for people asking for it by name ("cohort", "build cohort") or starting a
 * population question ("find patients who…"). Outside a chart only; no network.
 */

/**
 * Shown when the query starts with one of these. A shorter start such as "coh" is left alone: this row
 * is ready before patient search answers, so it would keep the highlight above a patient like Cohen.
 */
const PREFIXES = [
  'cohort',
  'build cohort',
  'build a cohort',
  'find patients who',
  'find patients with',
  'patients who',
];

function asksForCohortBuilder(query: string): boolean {
  const q = query.trim().toLowerCase().replace(/\s+/g, ' ');
  return PREFIXES.some((prefix) => q.startsWith(prefix));
}

const CohortBuilderProvider: React.FC<OmnibarProviderProps> = (props) => {
  const { query, report } = props;
  const { t } = useTranslation();
  const offered = useCohortRowsAllowed(props) && asksForCohortBuilder(query);

  useEffect(() => {
    const title = t('omnibarCohorts', 'Cohorts');
    if (!offered) {
      report({ query, title, status: 'idle' });
      return;
    }
    report({
      query,
      title,
      status: 'ready',
      results: [
        {
          id: 'cohort-builder',
          title: t('cohortBuilder', 'Cohort Builder'),
          subtitle: t('cohortBuilderSubtitle', 'Find patients by age, gender, program, drug orders and more'),
          target: { type: 'navigate', to: cohortBuilderPath },
        },
      ],
    });
  }, [query, offered, report, t]);

  return null;
};

export default CohortBuilderProvider;
