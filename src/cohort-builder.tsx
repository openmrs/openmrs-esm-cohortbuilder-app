import React from "react";
import styles from "./cohort-builder.css";
import { CohortTable } from "./components/cohort-table/cohort-table.component";
import { SearchHistory } from "./components/search-history/search-history.component";
import { NavigationTabs } from "./components/tabs/navigation-tabs.component";

const CohortBuilder: React.FC = () => {
  return (
    <div className={`omrs-main-content ${styles.container}`}>
      <NavigationTabs />
      <CohortTable patients={[]} />
      <SearchHistory />
    </div>
  );
};

export default CohortBuilder;
