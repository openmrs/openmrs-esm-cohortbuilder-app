import React from "react";

import { Tab, Tabs } from "carbon-components-react";

import styles from "./cohort-builder.css";
import { CohortTable } from "./components/cohort-table/cohort-table.component";
import { SearchByConcepts } from "./components/search-by-concepts/search-by-concepts.component";
import { SearchHistory } from "./components/search-history/search-history.component";

interface TabItem {
  name: string;
  component: JSX.Element;
}

const tabs: TabItem[] = [
  {
    name: "Concepts",
    component: <SearchByConcepts />,
  },
  {
    name: "Demographics",
    component: <SearchByConcepts />,
  },
  {
    name: "Encounters",
    component: <SearchByConcepts />,
  },
  {
    name: "Enrollments",
    component: <SearchByConcepts />,
  },
  {
    name: "Drug Order",
    component: <SearchByConcepts />,
  },
  {
    name: "SQL",
    component: <SearchByConcepts />,
  },
  {
    name: "Composition",
    component: <SearchByConcepts />,
  },
  {
    name: "Saved Definitions",
    component: <SearchByConcepts />,
  },
];

const CohortBuilder: React.FC = () => {
  return (
    <div className={`omrs-main-content ${styles.container}`}>
      <Tabs>
        {tabs.map((tab: TabItem, index: number) => (
          <Tab key={index} label={tab.name}>
            {tab.component}
          </Tab>
        ))}
      </Tabs>
      <CohortTable />
      <SearchHistory />
    </div>
  );
};

export default CohortBuilder;
