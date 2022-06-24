import React, { useState } from "react";

import { InlineNotification, Tab, Tabs } from "carbon-components-react";

import { search } from "./cohort-builder.resource";
import styles from "./cohort-builder.scss";
import { addToHistory } from "./cohort-builder.utils";
import { CohortResultsTable } from "./components/cohort-results-table/cohort-results-table.component";
import SearchButtonSet from "./components/search-button-set/search-button-set";
import { SearchByConcepts } from "./components/search-by-concepts/search-by-concepts.component";
import { SearchHistory } from "./components/search-history/search-history.component";
import { Patient, SearchParams } from "./types/types";

interface TabItem {
  name: string;
  component: JSX.Element;
}

interface Notification {
  kind:
    | "error"
    | "info"
    | "info-square"
    | "success"
    | "warning"
    | "warning-alt";
  title: string;
}

const CohortBuilder: React.FC = () => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [resetInputs, setResetInputs] = useState(false);
  const [notification, setNotification] = useState<Notification>(null);
  const [searchParams, setSearchParams] = useState<SearchParams>({
    query: null,
  });
  const [queryDescription, setQueryDescription] = useState("");

  const tabs: TabItem[] = [
    {
      name: "Concepts",
      component: (
        <SearchByConcepts
          resetInputs={resetInputs}
          setSearchParams={setSearchParams}
          setQueryDescription={setQueryDescription}
        />
      ),
    },
    {
      name: "Demographics",
      component: <span></span>,
    },
    {
      name: "Encounters",
      component: <span></span>,
    },
    {
      name: "Enrollments",
      component: <span></span>,
    },
    {
      name: "Drug Order",
      component: <span></span>,
    },
    {
      name: "SQL",
      component: <span></span>,
    },
    {
      name: "Composition",
      component: <span></span>,
    },
    {
      name: "Saved Definitions",
      component: <span></span>,
    },
  ];

  const handleReset = () => {
    setPatients([]);
    setNotification(null);
    setResetInputs(true);
  };

  const handleSubmit = async () => {
    setPatients([]);
    setIsLoading(true);
    try {
      const { data } = await search(searchParams);
      await data.rows.map(
        (patient: Patient) => (patient.id = patient.patientId.toString())
      );
      setPatients(data.rows);
      addToHistory(queryDescription, data.rows, searchParams.query);
      setNotification({
        kind: "success",
        title: `Search is completed with ${patients.length} result(s)`,
      });
      setIsLoading(false);
    } catch (e) {
      setNotification({ kind: "error", title: "Something went wrong!" });
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
        handleReset={handleReset}
        handleSubmit={handleSubmit}
        isLoading={isLoading}
      />
      {notification && (
        <InlineNotification
          kind={notification.kind}
          title={notification.title}
        />
      )}
      <CohortResultsTable patients={patients} />
      <SearchHistory />
    </div>
  );
};

export default CohortBuilder;
