import React, { useState } from 'react';
import classNames from 'classnames';
import { InlineNotification, Tab, Tabs, TabPanels, TabPanel, TabList } from '@carbon/react';
import { useTranslation } from 'react-i18next';
import { CohortsPictogram, PageHeader, PageHeaderContent, showSnackbar, useLayoutType } from '@openmrs/esm-framework';
import {
  CohortMembersLoadError,
  getCohortMembers,
  getDataSet,
  MAX_COHORT_MEMBERS_SHOWN,
  search,
} from './cohort-builder.resources';
import { addToHistory, getPatientName } from './cohort-builder.utils';
import type { Patient, SearchParams } from './types';
import { type CohortDefinition, type Criterion, type FormValues, toFormValues } from './url-definition/url-definition';
import { useUrlDefinition } from './url-definition/use-url-definition';
import Composition from './components/composition/composition.component';
import SavedCohorts from './components/saved-cohorts/saved-cohorts.component';
import SavedQueries from './components/saved-queries/saved-queries.component';
import SearchByConcepts from './components/search-by-concepts/search-by-concepts.component';
import SearchByDemographics from './components/search-by-demographics/search-by-demographics.component';
import SearchByDrugOrder from './components/search-by-drug-orders/search-by-drug-orders.component';
import SearchByEncounters from './components/search-by-encounters/search-by-encounters.component';
import SearchByEnrollments from './components/search-by-enrollments/search-by-enrollments.component';
import SearchByLocation from './components/search-by-location/search-by-location.component';
import SearchByPersonAttributes from './components/search-by-person-attributes/search-by-person-attributes.component';
import SearchHistory from './components/search-history/search-history.component';
import SearchResultsTable from './components/search-results-table/search-results-table.component';
import styles from './cohort-builder.scss';

interface TabItem {
  name: string;
  component: React.JSX.Element;
  /** The tab a definition link shows when this is its first criterion's type. */
  criterionType?: Criterion['type'];
}

const CohortBuilder: React.FC = () => {
  const { t } = useTranslation();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [isHistoryUpdated, setIsHistoryUpdated] = useState(true);
  const [cohortMemberCounts, setCohortMemberCounts] = useState<{ total: number; unavailable: number } | null>(null);
  const [selectedTab, setSelectedTab] = useState(0);
  // The tabs a definition link fills in start from these values. They are keyed by `link`, so each new
  // link starts them over, while re-renders keep what the user has changed since.
  const [prefill, setPrefill] = useState<{ link: number; values: FormValues }>({ link: 0, values: {} });
  const isLayoutTablet = useLayoutType() === 'tablet';

  const runSearch = (searchParams: SearchParams, queryDescription: string): Promise<boolean> => {
    return new Promise((resolve) => {
      setPatients([]);
      setCohortMemberCounts(null);
      search(searchParams)
        .then(({ data: { rows } }) => {
          rows.map((patient: Patient) => {
            patient.id = patient.patientId.toString();
            patient.name = getPatientName(patient.firstname, patient.lastname);
          });
          setPatients(rows);
          addToHistory(queryDescription, rows, searchParams.query);
          showSnackbar({
            title: t('searchCompleted', 'Search completed'),
            kind: 'success',
            isLowContrast: true,
            subtitle: t('noOfResultsFound', '{{count}} results found', {
              count: rows.length,
            }),
          });
          setIsHistoryUpdated(true);
          resolve(true);
        })
        .catch((error) => {
          showSnackbar({
            title: t('error', 'Error'),
            kind: 'error',
            isLowContrast: false,
            subtitle: error?.message,
          });
          resolve(false);
        });
    });
  };

  const getQueryResults = async (queryId: string) => {
    try {
      const patients = await getDataSet(queryId);
      setPatients(patients);
      setCohortMemberCounts(null);
      showSnackbar({
        title: t('searchCompleted', 'Search completed'),
        kind: 'success',
        isLowContrast: true,
        subtitle: t('noOfResultsFound', '{{count}} results found', {
          count: patients.length,
        }),
      });
      return true;
    } catch (error) {
      showSnackbar({
        title: t('error', 'Error'),
        kind: 'error',
        isLowContrast: false,
        subtitle: error?.message,
      });
      return false;
    }
  };

  const getCohortResults = async (cohortId: string) => {
    try {
      const { patients, total, unavailable } = await getCohortMembers(cohortId);
      setPatients(patients);
      setCohortMemberCounts({ total, unavailable });
      if (unavailable > 0) {
        showSnackbar({
          title: t('someCohortMembersNotShown', "Some of the cohort's members could not be shown"),
          kind: 'warning',
          isLowContrast: true,
          subtitle: t('showingCohortMembers', 'Showing {{shown}} of {{count}} members', {
            shown: patients.length,
            count: total,
          }),
        });
      } else {
        showSnackbar({
          title: t('searchCompleted', 'Search completed'),
          kind: 'success',
          isLowContrast: true,
          subtitle: t('noOfResultsFound', '{{count}} results found', {
            count: patients.length,
          }),
        });
      }
      return true;
    } catch (error) {
      showSnackbar({
        title: t('error', 'Error'),
        kind: 'error',
        isLowContrast: false,
        subtitle:
          error instanceof CohortMembersLoadError
            ? t('cohortMembersLoadFailed', "None of the cohort's members could be loaded")
            : error?.message,
      });
      return false;
    }
  };

  const tabs: TabItem[] = [
    {
      name: t('concepts', 'Concepts'),
      component: <SearchByConcepts onSubmit={runSearch} />,
    },
    {
      name: t('demographics', 'Demographics'),
      component: (
        <SearchByDemographics key={prefill.link} onSubmit={runSearch} initialValues={prefill.values.demographics} />
      ),
      criterionType: 'demographics',
    },
    {
      name: t('personAttributes', 'Person Attributes'),
      component: <SearchByPersonAttributes onSubmit={runSearch} />,
    },
    {
      name: t('encounters', 'Encounters'),
      component: <SearchByEncounters onSubmit={runSearch} />,
    },
    {
      name: t('location', 'Location'),
      component: <SearchByLocation onSubmit={runSearch} />,
    },
    {
      name: t('enrollments', 'Enrollments'),
      component: (
        <SearchByEnrollments key={prefill.link} onSubmit={runSearch} initialValues={prefill.values.enrollment} />
      ),
      criterionType: 'enrollment',
    },
    {
      name: t('drugOrder', 'Drug Order'),
      component: <SearchByDrugOrder key={prefill.link} onSubmit={runSearch} initialValues={prefill.values.drugOrder} />,
      criterionType: 'drugOrder',
    },
    {
      name: t('composition', 'Composition'),
      component: <Composition onSubmit={runSearch} />,
    },
    {
      name: t('savedCohorts', 'Saved Cohorts'),
      component: <SavedCohorts onViewCohort={getCohortResults} />,
    },
    {
      name: t('savedQueries', 'Saved Queries'),
      component: <SavedQueries onViewQuery={getQueryResults} />,
    },
  ];

  const fillInTabs = (definition: CohortDefinition, names: Map<string, string>) => {
    setPrefill(({ link }) => ({ link: link + 1, values: toFormValues(definition, names) }));
    setSelectedTab(tabs.findIndex((tab) => tab.criterionType === definition.criteria[0].type));
  };

  const urlDefinitionError = useUrlDefinition({
    runSearch,
    showCohort: getCohortResults,
    showQuery: getQueryResults,
    onHistoryChange: () => setIsHistoryUpdated(true),
    onDefinition: fillInTabs,
  });

  return (
    <div>
      <PageHeader className={styles.header}>
        <PageHeaderContent illustration={<CohortsPictogram />} title={t('cohortBuilder', 'Cohort Builder')} />
      </PageHeader>
      <div className={classNames(styles.mainContainer, styles.cohortBuilder)}>
        <div className={classNames(isLayoutTablet ? styles.tabletContainer : styles.desktopContainer)}>
          {urlDefinitionError && (
            <InlineNotification
              kind="error"
              lowContrast
              title={t('cohortBuilderLinkError', 'This cohort builder link could not be opened')}
              subtitle={urlDefinitionError}
            />
          )}
          <div className={styles.tabContainer}>
            <p className={styles.heading}>{t('searchCriteria', 'Search Criteria')}</p>
            <div className={styles.tab}>
              <Tabs selectedIndex={selectedTab} onChange={({ selectedIndex }) => setSelectedTab(selectedIndex)}>
                <TabList aria-label="navigation">
                  {tabs.map((tab: TabItem, index: number) => (
                    <Tab className={styles.tab} key={index}>
                      {tab.name}
                    </Tab>
                  ))}
                </TabList>
                <TabPanels>
                  {tabs.map((tab: TabItem, index: number) => (
                    <TabPanel key={index}>{tab.component}</TabPanel>
                  ))}
                </TabPanels>
              </Tabs>
            </div>
          </div>
          {cohortMemberCounts?.total > MAX_COHORT_MEMBERS_SHOWN && (
            <InlineNotification
              kind="info"
              lowContrast
              hideCloseButton
              title={t('cohortMembersLimited', 'Only the first {{limit}} of {{total}} members are loaded', {
                limit: MAX_COHORT_MEMBERS_SHOWN,
                total: cohortMemberCounts.total,
              })}
            />
          )}
          <SearchResultsTable patients={patients} />
          <SearchHistory isHistoryUpdated={isHistoryUpdated} setIsHistoryUpdated={setIsHistoryUpdated} />
        </div>
      </div>
    </div>
  );
};

export default CohortBuilder;
