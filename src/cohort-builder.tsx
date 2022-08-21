import React, { useState } from "react";

import { Tab, Tabs, TabList, TabPanels, TabPanel } from "@carbon/react";
import { showToast, useLayoutType } from "@openmrs/esm-framework";
import { useTranslation } from "react-i18next";

import {
  getCohortMembers,
  getDataSet,
  search,
} from "./cohort-builder.resources";
import styles from "./cohort-builder.scss";
import { addToHistory } from "./cohort-builder.utils";
import Composition from "./components/composition/composition.component";
import SavedCohorts from "./components/saved-cohorts/saved-cohorts.component";
import SavedQueries from "./components/saved-queries/saved-queries.component";
import SearchByConcepts from "./components/search-by-concepts/search-by-concepts.component";
import SearchByDemographics from "./components/search-by-demographics/search-by-demographics.component";
import SearchByDrugOrder from "./components/search-by-drug-orders/search-by-drug-orders.component";
import SearchByEncounters from "./components/search-by-encounters/search-by-encounters.component";
import SearchByEnrollments from "./components/search-by-enrollments/search-by-enrollments.component";
import SearchByLocation from "./components/search-by-location/search-by-location.component";
import SearchByPersonAttributes from "./components/search-by-person-attributes/search-by-person-attributes.component";
import SearchHistory from "./components/search-history/search-history.component";
import SearchResultsTable from "./components/search-results-table/search-results-table.component";
import { Patient, SearchParams } from "./types";

interface TabItem {
  name: string;
  component: JSX.Element;
}

const CohortBuilder: React.FC = () => {
  const { t } = useTranslation();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [isHistoryUpdated, setIsHistoryUpdated] = useState(true);
  const isLayoutTablet = useLayoutType() === "tablet";

  const runSearch = (
    searchParams: SearchParams,
    queryDescription: string
  ): Promise<boolean> => {
    return new Promise(async (resolve) => {
      setPatients([]);
      try {
        const {
          data: { rows },
        } = await search(searchParams);
        rows.map((patient: Patient) => {
          patient.id = patient.patientId.toString();
          patient.name = `${patient.firstname} ${patient.lastname}`;
        });
        setPatients(rows);
        addToHistory(queryDescription, rows, searchParams.query);
        showToast({
          title: t("success", "Success!"),
          kind: "success",
          critical: true,
          description: t(
            "searchIsCompleted",
            `Search is completed with ${rows.length} result(s)`,
            { numOfResults: rows.length }
          ),
        });
        setIsHistoryUpdated(true);
        resolve(true);
      } catch (error) {
        showToast({
          title: t("error", "Error"),
          kind: "error",
          critical: true,
          description: error?.message,
        });
        resolve(true);
      }
    });
  };

  const getQueryResults = async (queryId: string) => {
    try {
      const patients = await getDataSet(queryId);
      setPatients(patients);
      showToast({
        title: t("success", "Success!"),
        kind: "success",
        critical: true,
        description: t(
          "searchIsCompleted",
          `Search is completed with ${patients.length} result(s)`,
          { numOfResults: patients.length }
        ),
      });
    } catch (error) {
      showToast({
        title: t("error", "Error"),
        kind: "error",
        critical: true,
        description: error?.message,
      });
    }
  };

  const getCohortResults = async (cohortId: string) => {
    try {
      const patients = await getCohortMembers(cohortId);
      setPatients(patients);
      showToast({
        title: t("success", "Success!"),
        kind: "success",
        critical: true,
        description: t(
          "searchIsCompleted",
          `Search is completed with ${patients.length} result(s)`,
          { numOfResults: patients.length }
        ),
      });
    } catch (error) {
      showToast({
        title: t("error", "Error"),
        kind: "error",
        critical: true,
        description: error?.message,
      });
    }
  };

  const tabs: TabItem[] = [
    {
      name: t("concepts", "Concepts"),
      component: <SearchByConcepts onSubmit={runSearch} />,
    },
    {
      name: t("demographics", "Demographics"),
      component: <SearchByDemographics onSubmit={runSearch} />,
    },
    {
      name: t("personAttributes", "Person Attributes"),
      component: <SearchByPersonAttributes onSubmit={runSearch} />,
    },
    {
      name: t("encounters", "Encounters"),
      component: <SearchByEncounters onSubmit={runSearch} />,
    },
    {
      name: t("location", "Location"),
      component: <SearchByLocation onSubmit={runSearch} />,
    },
    {
      name: t("enrollments", "Enrollments"),
      component: <SearchByEnrollments onSubmit={runSearch} />,
    },
    {
      name: t("drugOrder", "Drug Order"),
      component: <SearchByDrugOrder onSubmit={runSearch} />,
    },
    {
      name: "SQL",
      component: <span></span>,
    },
    {
      name: t("composition", "Composition"),
      component: <Composition onSubmit={runSearch} />,
    },
    {
      name: t("savedDefinitions", "Saved Cohorts"),
      component: <SavedCohorts onViewCohort={getCohortResults} />,
    },
    {
      name: t("savedDefinitions", "Saved Queries"),
      component: <SavedQueries onViewQuery={getQueryResults} />,
    },
  ];

  return (
    <div
      className={`omrs-main-content ${styles.mainContainer} ${styles.cohortBuilder}`}
    >
      <div
        className={
          isLayoutTablet ? styles.tabletContainer : styles.desktopContainer
        }
      >
        <p className={styles.title}>{t("cohortBuilder", "Cohort Builder")}</p>
        <div className={styles.tabContainer}>
          <p className={styles.heading}>
            {t("searchCriteria", "Search Criteria")}
          </p>
          <div className={styles.tab}>
            <Tabs
              className={`${styles.verticalTabs} ${
                isLayoutTablet ? styles.tabletTab : styles.desktopTab
              }`}
            >
              <TabList aria-label="navigation">
                {tabs.map((tab: TabItem, index: number) => (
                  <Tab key={index}>{tab.name}</Tab>
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
        <SearchResultsTable patients={patients} />
        <SearchHistory
          isHistoryUpdated={isHistoryUpdated}
          setIsHistoryUpdated={setIsHistoryUpdated}
        />
      </div>
    </div>
  );
};

export default CohortBuilder;
