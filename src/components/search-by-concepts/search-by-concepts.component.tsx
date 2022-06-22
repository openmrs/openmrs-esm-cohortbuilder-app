import React, { useEffect, useState } from "react";
import {
  ButtonSet,
  Button,
  DatePicker,
  DatePickerInput,
  Column,
  Dropdown,
  Search,
  CodeSnippetSkeleton,
  NumberInput,
  InlineLoading,
  InlineNotification,
} from "carbon-components-react";
import { getConcepts, search } from "./search-by-concepts.resource";
import { JSONHelper } from "./jsonHelper";
import { queryDescriptionBuilder } from "./helpers";
import styles from "./search-by-concepts.style.css";
import moment from "moment";
import { getGlobalStore } from "@openmrs/esm-framework";

interface Concept {
  uuid: string;
  units: string;
  answers: string[];
  hl7Abbrev: string;
  name: string;
  description: string;
  datatype: any;
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

const observationOptions = [
  {
    id: "option-0",
    label: "Patients who have these observations",
    value: "ANY",
  },
  {
    id: "option-1",
    label: "Patients who do not have these observations",
    value: "NO",
  },
];

const notificationStore = getGlobalStore("notification");

export const SearchByConcepts: React.FC = () => {
  const [searchResults, setSearchResults] = useState<Concept[]>([]);
  const [notification, setNotification] = useState<Notification>(null);
  const [concept, setConcept] = useState<Concept>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [lastDays, setLastDays] = useState(0);
  const [lastMonths, setLastMonths] = useState(0);
  const [isSearchResultsEmpty, setIsSearchResultsEmpty] = useState(false);
  const [observations, setObservations] = useState({
    timeModifier: "ANY",
    question: "",
    operator1: "LESS_THAN",
    modifier: "",
    onOrBefore: "",
    onOrAfter: "",
  });
  const jsonHelper = new JSONHelper();

  useEffect(() => {
    notificationStore.subscribe((store) => {
      setNotification(store.notification);
    });
  }, []);

  const onSearch = (search: string) => {
    if (search.length > 2) {
      setConcept(null);
      setSearchResults([]);
      setIsSearching(true);
      getConcepts(search).then((results: Concept[]) => {
        results.length
          ? setSearchResults(results)
          : setIsSearchResultsEmpty(true);
        setIsSearching(false);
      });
    }
  };

  const handleLastDaysAndMonths = () => {
    if (lastDays && lastMonths) {
      const onOrAfter = moment()
        .subtract(lastDays, "days")
        .subtract(lastMonths, "months")
        .format("DD-MM-YYYY");
      setObservations({ ...observations, onOrAfter });
    }
  };

  const handleDates = (dates: Date[]) => {
    setObservations({
      ...observations,
      onOrBefore: moment(dates[0]).format("DD-MM-YYYY"),
      onOrAfter: moment(dates[1]).format("DD-MM-YYYY"),
    });
  };

  const onSearchClear = () => {
    setIsSearchResultsEmpty(false);
    setSearchResults([]);
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    handleLastDaysAndMonths();
    const types = {
      CWE: "codedObsSearchAdvanced",
      NM: "numericObsSearchAdvanced",
      DT: "dateObsSearchAdvanced",
      ST: "dateObsSearchAdvanced",
      TS: "textObsSearchAdvanced",
      ZZ: "codedObsSearchAdvanced",
      BIT: "codedObsSearchAdvanced",
    };
    const { hl7Abbrev, name } = concept;
    const dataType = types[hl7Abbrev];
    const params = { [dataType]: [] };

    Object.keys(observations).forEach((key) => {
      observations[key] !== ""
        ? params[dataType].push({
            name:
              key === "modifier"
                ? ["CWE", "TS"].includes(hl7Abbrev)
                  ? "values"
                  : "value1"
                : key,
            value:
              key === "modifier" && ["CWE", "TS"].includes(hl7Abbrev)
                ? [observations[key]]
                : observations[key],
          })
        : "";
    });

    const searchData = jsonHelper.composeJson(params);

    const description = queryDescriptionBuilder(observations, name);
    await search(searchData, description);
    setIsLoading(false);
  };

  return (
    <div>
      <h5>Search By Concepts</h5>
      <div>
        <Column className={styles.column}>
          <Search
            closeButtonLabelText="Clear search"
            id="concept-search"
            labelText="Search Concepts"
            placeholder="Search Concepts"
            onChange={(e) => onSearch(e.target.value)}
            onClear={onSearchClear}
            size="lg"
          />
          <div className={styles.search}>
            {isSearching ? (
              <CodeSnippetSkeleton type="multi" />
            ) : (
              searchResults.map((concept: Concept) => (
                <div key={concept.uuid}>
                  <Button
                    kind="ghost"
                    onClick={() => {
                      setConcept(concept);
                      setObservations({
                        ...observations,
                        question: concept.uuid,
                      });
                      setSearchResults([]);
                    }}
                  >
                    {concept.name}
                  </Button>
                  <br />
                </div>
              ))
            )}
          </div>
          {concept && (
            <p className={styles.text}>
              Patients with observations whose answer is{" "}
              <span style={{ fontWeight: "bold" }}>{concept.name}</span>
            </p>
          )}
          {isSearchResultsEmpty && (
            <p className={styles.text}>There are no search items</p>
          )}
        </Column>
        <Column className={styles.column} sm={2} md={{ span: 4 }}>
          <Dropdown
            id="timeModifier"
            onChange={(data) =>
              setObservations({
                ...observations,
                timeModifier: data.selectedItem.value,
              })
            }
            initialSelectedItem={observationOptions[0]}
            items={observationOptions}
            label=""
          />
        </Column>
        <Column className={styles.column}>
          <div style={{ display: "flex" }}>
            <div style={{ display: "flex", alignItems: "center" }}>
              <p style={{ paddingRight: 20 }}>Within the last </p>
              <NumberInput
                id="last-months"
                invalidText="Number is not valid"
                min={0}
                size="sm"
                value={0}
                onChange={(e) => setLastMonths(e.imaginaryTarget.value)}
              />
              <p style={{ paddingRight: 20, paddingLeft: 20 }}>months</p>
            </div>
            <div style={{ display: "flex", alignItems: "center" }}>
              <NumberInput
                id="last-days"
                invalidText="Number is not valid"
                min={0}
                size="sm"
                value={0}
                onChange={(e) => setLastDays(e.imaginaryTarget.value)}
              />
              <p style={{ paddingRight: 20, paddingLeft: 20 }}>and/or days</p>
            </div>
          </div>
        </Column>
        <Column className={styles.column}>
          <p className={styles.dateRange}>Date Range :</p>
          <DatePicker
            datePickerType="range"
            dateFormat="d-m-Y"
            allowInput={false}
            onChange={(dates: Date[]) => handleDates(dates)}
          >
            <DatePickerInput
              id="date-picker-input-id-start"
              labelText="Start date"
              placeholder="DD-MM-YYYY"
              size="md"
            />
            <DatePickerInput
              id="date-picker-input-id-finish"
              labelText="End date"
              placeholder="DD-MM-YYYY"
              size="md"
            />
          </DatePicker>
        </Column>
        <Column sm={2} md={{ span: 4, offset: 4 }} className={styles.column}>
          <ButtonSet className={styles.buttonSet}>
            <Button kind="primary" onClick={handleSubmit}>
              {isLoading ? <InlineLoading description="Loading" /> : "Search"}
            </Button>
            <Button kind="secondary">Reset</Button>
          </ButtonSet>
          {notification && (
            <InlineNotification
              className={styles.notification}
              kind={notification.kind}
              title={notification.title}
            />
          )}
        </Column>
      </div>
    </div>
  );
};
