import React, { useState } from "react";

import { showNotification } from "@openmrs/esm-framework";
import { Tab, Tabs } from "carbon-components-react";
import { useTranslation } from "react-i18next";

import { search } from "./cohort-builder.resource";
import styles from "./cohort-builder.scss";
import { addToHistory } from "./cohort-builder.utils";
import SearchButtonSet from "./components/search-button-set/search-button-set";
import { SearchByConcepts } from "./components/search-by-concepts/search-by-concepts.component";
import { SearchHistory } from "./components/search-history/search-history.component";
import { SearchResultsTable } from "./components/search-results-table/search-results-table.component";
import { Patient, SearchParams } from "./types/types";

interface TabItem {
  name: string;
  component: JSX.Element;
}

const CohortBuilder: React.FC = () => {
  const { t } = useTranslation();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [resetInputs, setResetInputs] = useState(false);
  const [isHistoryUpdated, setIsHistoryUpdated] = useState(true);
  const [searchParams, setSearchParams] = useState<SearchParams>({
    query: null,
  });
  const [queryDescription, setQueryDescription] = useState("");

  const tabs: TabItem[] = [
    {
      name: t("concept", "Concept"),
      component: (
        <SearchByConcepts
          resetInputs={resetInputs}
          setSearchParams={setSearchParams}
          setQueryDescription={setQueryDescription}
        />
      ),
    },
    {
      name: t("demographics", "Demographics"),
      component: <span></span>,
    },
    {
      name: t("encounters", "Encounters"),
      component: <span></span>,
    },
    {
      name: t("enrollments", "Enrollments"),
      component: <span></span>,
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

  const handleReset = () => {
    setPatients([]);
    setResetInputs(true);
  };

  const handleSubmit = async () => {
    setPatients([]);
    setIsLoading(true);
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
      showNotification({
        title: t("success", "Success!"),
        kind: "success",
        critical: true,
        description: t(
          "searchIsCompleted",
          `Search is completed with ${rows.length} result(s)`,
          { numOfResults: rows.length }
        ),
      });
      setIsLoading(false);
      setIsHistoryUpdated(true);
    } catch (error) {
      showNotification({
        title: t("error", "Error"),
        kind: "error",
        critical: true,
        description: error?.message,
      });
      setIsLoading(false);
    }
  };

  return (
    <div className={`omrs-main-content ${styles.container}`}>
      <Tabs className={styles.tab}>
        {tabs.map((tab: TabItem, index: number) => (
          <Tab key={index} label={tab.name}>
            {tab.component}
          </Tab>
        ))}
      </Tabs>
      <SearchButtonSet
        onHandleReset={handleReset}
        onHandleSubmit={handleSubmit}
        isLoading={isLoading}
      />
      <SearchResultsTable patients={patients} />
      <SearchHistory
        isHistoryUpdated={isHistoryUpdated}
        setIsHistoryUpdated={setIsHistoryUpdated}
      />
    </div>
  );
};

export default CohortBuilder;
