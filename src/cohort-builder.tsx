import React from "react";

import styles from "./cohort-builder.css";
import { CohortTable } from "./components/cohort-table/cohort-table.component";
import { NavigationTabs } from "./components/navigation-tabs/navigation-tabs.component";
import { SearchHistory } from "./components/search-history/search-history.component";

const CohortBuilder: React.FC = () => {
  return (
    <div className={`omrs-main-content ${styles.container}`}>
      <NavigationTabs />
      <CohortTable />
      <SearchHistory />
    </div>
  );
};

export default CohortBuilder;
