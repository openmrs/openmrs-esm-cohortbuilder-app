import React, { useState } from 'react';
import classNames from 'classnames';
import { Tab, Tabs, TabPanels, TabPanel, TabList } from '@carbon/react';
import { useTranslation } from 'react-i18next';
import { showSnackbar, useLayoutType } from '@openmrs/esm-framework';
import { getCohortMembers, getDataSet, search } from './cohort-builder.resources';
import { addToHistory } from './cohort-builder.utils';
import type { Patient, SearchParams } from './types';
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
  component: JSX.Element;
}

const CohortBuilder: React.FC = () => {
  const { t } = useTranslation();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [isHistoryUpdated, setIsHistoryUpdated] = useState(true);
  const isLayoutTablet = useLayoutType() === 'tablet';

  const runSearch = (searchParams: SearchParams, queryDescription: string): Promise<boolean> => {
    return new Promise((resolve) => {
      setPatients([]);
      search(searchParams)
        .then(({ data: { rows } }) => {
          rows.map((patient: Patient) => {
            patient.id = patient.patientId.toString();
            patient.name = `${patient.firstname} ${patient.lastname}`;
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
          resolve(true);
        });
    });
  };

  const getQueryResults = async (queryId: string) => {
    try {
      const patients = await getDataSet(queryId);
      setPatients(patients);
      showSnackbar({
        title: t('searchCompleted', 'Search completed'),
        kind: 'success',
        isLowContrast: true,
        subtitle: t('noOfResultsFound', '{{count}} results found', {
          count: patients.length,
        }),
      });
    } catch (error) {
      showSnackbar({
        title: t('error', 'Error'),
        kind: 'error',
        isLowContrast: false,
        subtitle: error?.message,
      });
    }
  };

  const getCohortResults = async (cohortId: string) => {
    try {
      const patients = await getCohortMembers(cohortId);
      setPatients(patients);
      showSnackbar({
        title: t('searchCompleted', 'Search completed'),
        kind: 'success',
        isLowContrast: true,
        subtitle: t('noOfResultsFound', '{{count}} results found', {
          count: patients.length,
        }),
      });
    } catch (error) {
      showSnackbar({
        title: t('error', 'Error'),
        kind: 'error',
        isLowContrast: false,
        subtitle: error?.message,
      });
    }
  };

  const tabs: TabItem[] = [
    {
      name: t('concepts', 'Concepts'),
      component: <SearchByConcepts onSubmit={runSearch} />,
    },
    {
      name: t('demographics', 'Demographics'),
      component: <SearchByDemographics onSubmit={runSearch} />,
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
      component: <SearchByEnrollments onSubmit={runSearch} />,
    },
    {
      name: t('drugOrder', 'Drug Order'),
      component: <SearchByDrugOrder onSubmit={runSearch} />,
    },
    {
      name: t('composition', 'Composition'),
      component: <Composition onSubmit={runSearch} />,
    },
    {
      name: t('savedDefinitions', 'Saved Cohorts'),
      component: <SavedCohorts onViewCohort={getCohortResults} />,
    },
    {
      name: t('savedDefinitions', 'Saved Queries'),
      component: <SavedQueries onViewQuery={getQueryResults} />,
    },
  ];

  return (
    <main className={classNames(styles.mainContainer, styles.cohortBuilder)}>
      <div className={classNames(isLayoutTablet ? styles.tabletContainer : styles.desktopContainer)}>
        <header>
          <h1 className={styles.title}>{t('cohortBuilder', 'Cohort Builder')}</h1>
        </header>
        <section className={styles.tabContainer} aria-labelledby="search-criteria-heading">
          <h2 id="search-criteria-heading" className={styles.heading}>
            {t('searchCriteria', 'Search Criteria')}
          </h2>
          <div className={styles.tab}>
            <Tabs>
              <TabList aria-label={t('searchCriteriaNavigation', 'Search criteria navigation')}>
                {tabs.map((tab: TabItem, index: number) => (
                  <Tab className={styles.tab} key={index} id={`search-tab-${index}`}>
                    {tab.name}
                  </Tab>
                ))}
              </TabList>
              <TabPanels>
                {tabs.map((tab: TabItem, index: number) => (
                  <TabPanel key={index} aria-labelledby={`search-tab-${index}`}>
                    {tab.component}
                  </TabPanel>
                ))}
              </TabPanels>
            </Tabs>
          </div>
        </section>
        <section>
          <SearchResultsTable patients={patients} />
        </section>
        <section>
          <SearchHistory isHistoryUpdated={isHistoryUpdated} setIsHistoryUpdated={setIsHistoryUpdated} />
        </section>
      </div>
    </main>
  );
};

export default CohortBuilder;
