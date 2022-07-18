import React, { useState } from "react";

import { showToast } from "@openmrs/esm-framework";
import { Tab, Tabs } from "carbon-components-react";
import { useTranslation } from "react-i18next";

import { search } from "./cohort-builder.resource";
import styles from "./cohort-builder.scss";
import { addToHistory } from "./cohort-builder.utils";
import SearchByConcepts from "./components/search-by-concepts/search-by-concepts.component";
import SearchByDemographics from "./components/search-by-demographics/search-by-demographics.component";
import SearchByEncounters from "./components/search-by-encounters/search-by-encounters.component";
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
  const [selectedTab, setSelectedTab] = useState(0);

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
      name: t("drugOrder", "Drug Order"),
      component: <span></span>,
    },
    {
      name: "SQL",
      component: <span></span>,
    },
    {
      name: t("composition", "Composition"),
      component: <span></span>,
    },
    {
      name: t("savedDefinitions", "Saved Definitions"),
      component: <span></span>,
    },
  ];

  return (
    <div className={`omrs-main-content ${styles.mainContainer}`}>
      <div className={styles.container}>
        <p className={styles.title}>{t("cohortBuilder", "Cohort Builder")}</p>
        <div className={styles.tabContainer}>
          <p className={styles.heading}>
            {t("searchCriteria", "Search Criteria")}
          </p>
          <div className={styles.searchContainer}>
            <Tabs className={styles.verticalTabs}>
              {tabs.map((tab: TabItem, index: number) => (
                <Tab
                  key={index}
                  label={tab.name}
                  onClick={() => setSelectedTab(index)}
                  className={`${styles.tab} ${
                    selectedTab == index && styles.selectedTab
                  }`}
                >
                  {tab.component}
                </Tab>
              ))}
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
