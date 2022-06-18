import React from "react";
import { Tabs, Tab } from "carbon-components-react";
import { SearchByConcepts } from "../search-by-concepts/search-by-concepts.component";

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
    name: "Saved",
    component: <SearchByConcepts />,
  },
  {
    name: "Search History",
    component: <SearchByConcepts />,
  },
  {
    name: "Cohort Results",
    component: <SearchByConcepts />,
  },
];

export const NavigationTabs: React.FC = () => {
  return (
    <Tabs>
      {tabs.map((tab: TabItem, index: number) => (
        <Tab key={index} label={tab.name}>
          {tab.component}
        </Tab>
      ))}
    </Tabs>
  );
};
