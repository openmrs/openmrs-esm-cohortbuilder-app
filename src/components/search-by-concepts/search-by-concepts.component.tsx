import React, {
  Dispatch,
  SetStateAction,
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  DatePicker,
  DatePickerInput,
  Column,
  Dropdown,
  NumberInput,
  Switch,
  ContentSwitcher,
} from "carbon-components-react";
import dayjs from "dayjs";
import { useTranslation } from "react-i18next";

import {
  composeJson,
  queryDescriptionBuilder,
} from "../../cohort-builder.utils";
import { Concept, SearchParams } from "../../types";
import styles from "./search-by-concepts.style.scss";
import { SearchConcept } from "./search-concept/search-concept.component";

const operators = [
  {
    id: 0,
    label: "<",
    value: "LESS_THAN",
  },
  {
    id: 1,
    label: "<=",
    value: "LESS_EQUAL",
  },
  {
    id: 2,
    label: "=",
    value: "EQUAL",
  },
  {
    id: 3,
    label: ">=",
    value: "GREATER_EQUAL",
  },
  {
    id: 4,
    label: ">",
    value: "GREATER_THAN",
  },
];

interface Observation {
  timeModifier: string;
  question: string;
  operator1: string;
  modifier: string;
  onOrBefore: string;
  onOrAfter: string;
  value1: string;
}

interface SearchByConceptsProps {
  setQueryDescription: Dispatch<SetStateAction<String>>;
  setSearchParams: Dispatch<SetStateAction<SearchParams>>;
  resetInputs: boolean;
}

const types = {
  CWE: "codedObsSearchAdvanced",
  NM: "numericObsSearchAdvanced",
  DT: "dateObsSearchAdvanced",
  ST: "dateObsSearchAdvanced",
  TS: "textObsSearchAdvanced",
  ZZ: "codedObsSearchAdvanced",
  BIT: "codedObsSearchAdvanced",
};

export const SearchByConcepts: React.FC<SearchByConceptsProps> = ({
  setQueryDescription,
  setSearchParams,
  resetInputs,
}) => {
  const { t } = useTranslation();
  const [concept, setConcept] = useState<Concept>(null);
  const [lastDays, setLastDays] = useState(0);
  const [lastMonths, setLastMonths] = useState(0);
  const [operatorValue, setOperatorValue] = useState(0);
  const [operator, setOperator] = useState("LESS_THAN");
  const [timeModifier, setTimeModifier] = useState("ANY");
  const [onOrAfter, setOnOrAfter] = useState("");
  const [onOrBefore, setOnOrBefore] = useState("");
  const [searchText, setSearchText] = useState("");

  const observationOptions = [
    {
      id: "option-0",
      label: t("haveObservations", "Patients who have these observations"),
      value: "ANY",
    },
    {
      id: "option-1",
      label: t(
        "haveNoObservations",
        "Patients who do not have these observations"
      ),
      value: "NO",
    },
  ];

  const whichObservation = [
    {
      id: "option-0",
      label: t("any", "Any"),
      value: "ANY",
    },
    {
      id: "option-1",
      label: t("none", "None"),
      value: "NO",
    },
    {
      id: "option-2",
      label: t("earliest", "Earliest"),
      value: "FIRST",
    },
    {
      id: "option-3",
      label: t("recent", "Most Recent"),
      value: "LAST",
    },
    {
      id: "option-4",
      label: t("lowest", "Lowest"),
      value: "MIN",
    },
    {
      id: "option-5",
      label: t("highest", "Highest"),
      value: "MAX",
    },
    {
      id: "option-6",
      label: t("average", "Average"),
      value: "AVG",
    },
  ];

  useEffect(() => {
    if (resetInputs) {
      handleResetInputs();
    }
  }, [resetInputs]);

  const handleDates = (dates: Date[]) => {
    setOnOrAfter(dayjs(dates[0]).format());
    setOnOrBefore(dayjs(dates[1]).format());
  };

  const handleResetInputs = () => {
    setConcept(null);
    setLastDays(0);
    setSearchText("");
    setOnOrAfter("");
    setOnOrBefore("");
    setLastMonths(0);
    setOperatorValue(0);
    setOperator("LESS_THAN");
    setTimeModifier("ANY");
  };

  const handleInputValues = useCallback(() => {
    if (lastDays > 0 || lastMonths > 0) {
      const onOrAfter = dayjs()
        .subtract(lastDays, "days")
        .subtract(lastMonths, "months")
        .format();
      setOnOrBefore(onOrAfter);
    }
    const observations: Observation = {
      modifier: "",
      onOrAfter: onOrAfter,
      onOrBefore: onOrBefore,
      operator1: operator,
      question: concept.uuid,
      timeModifier: timeModifier,
      value1: operatorValue > 0 ? operatorValue.toString() : "",
    };
    const dataType = types[concept.hl7Abbrev];
    const params = { [dataType]: [] };
    Object.keys(observations).forEach((key) => {
      observations[key] !== ""
        ? params[dataType].push({
            name:
              key === "modifier"
                ? ["CWE", "TS"].includes(concept.hl7Abbrev)
                  ? "values"
                  : "value1"
                : key,
            value:
              key === "modifier" && ["CWE", "TS"].includes(concept.hl7Abbrev)
                ? [observations[key]]
                : observations[key],
          })
        : "";
    });
    setSearchParams(composeJson(params));
    setQueryDescription(queryDescriptionBuilder(observations, concept.name));
  }, [
    concept?.hl7Abbrev,
    concept?.name,
    concept?.uuid,
    lastDays,
    lastMonths,
    onOrAfter,
    onOrBefore,
    operator,
    operatorValue,
    setQueryDescription,
    setSearchParams,
    timeModifier,
  ]);

  useEffect(() => {
    if (concept) {
      handleInputValues();
    }
  }, [
    concept,
    handleInputValues,
    lastDays,
    lastMonths,
    onOrAfter,
    onOrBefore,
    operator,
    operatorValue,
    timeModifier,
  ]);

  return (
    <div className={styles.container}>
      <div>
        <SearchConcept
          setConcept={setConcept}
          concept={concept}
          searchText={searchText}
          setSearchText={setSearchText}
        />
        {concept?.hl7Abbrev === "NM" ? (
          <>
            <Column className={styles.column}>
              <div style={{ display: "flex" }}>
                <div className={styles.multipleInputs}>
                  <p style={{ paddingRight: 20 }}>
                    {t("whatObservations", "What observations")}
                  </p>
                  <Dropdown
                    id="timeModifier"
                    onChange={(data) =>
                      setTimeModifier(data.selectedItem.value)
                    }
                    initialSelectedItem={whichObservation[0]}
                    items={whichObservation}
                    className={styles.timeModifier}
                    label=""
                  />
                </div>
              </div>
            </Column>
            <Column className={styles.column}>
              <p className={styles.value}>{t("whatValues", "What values")}</p>
              <div className={styles.whatValuesInputs}>
                <div className={styles.operators}>
                  <ContentSwitcher
                    selectedIndex={operators[0].id}
                    className={styles.contentSwitcher}
                    size="lg"
                    onChange={({ index }) =>
                      setOperator(operators[index].value)
                    }
                  >
                    {operators.map((operator) => (
                      <Switch
                        key={operator.id}
                        name={operator.value}
                        text={operator.label}
                      />
                    ))}
                  </ContentSwitcher>
                </div>
                <div className={styles.multipleInputs}>
                  <NumberInput
                    id="operator-value"
                    invalidText={t("numberIsNotValid", "Number is not valid")}
                    label={t("valueIn", "Enter a value in ") + concept.units}
                    min={0}
                    size="sm"
                    value={0}
                    onChange={(event) =>
                      setOperatorValue(event.imaginaryTarget.value)
                    }
                  />
                </div>
              </div>
            </Column>
          </>
        ) : (
          <Column className={styles.column}>
            <Dropdown
              id="timeModifier"
              data-testid="timeModifier"
              onChange={(data) => setTimeModifier(data.selectedItem.value)}
              initialSelectedItem={observationOptions[0]}
              items={observationOptions}
              label=""
            />
          </Column>
        )}
        <Column className={styles.column}>
          <div className={styles.daysContainer}>
            <div
              className={styles.multipleInputs}
              style={{ width: 20, marginRight: 20 }}
            >
              <NumberInput
                id="last-months"
                data-testid="last-months"
                label={t("withinTheLast", "Within the last months")}
                invalidText={t("numberIsNotValid", "Number is not valid")}
                min={0}
                size="sm"
                value={lastMonths}
                onChange={(event) => setLastMonths(event.imaginaryTarget.value)}
              />
            </div>
            <div className={styles.multipleInputs}>
              <NumberInput
                label={t("lastDays", "and / or days")}
                id="last-days"
                data-testid="last-days"
                style={{ width: 20 }}
                invalidText={t("numberIsNotValid", "Number is not valid")}
                min={0}
                size="sm"
                value={lastDays}
                onChange={(event) => setLastDays(event.imaginaryTarget.value)}
              />
            </div>
          </div>
        </Column>
        <Column className={styles.column} style={{ display: "flex" }}>
          <p className={styles.dateRange}>{t("dateRange", "Date Range")}</p>
          <DatePicker
            datePickerType="range"
            dateFormat="d-m-Y"
            allowInput={false}
            onChange={(dates: Date[]) => handleDates(dates)}
          >
            <DatePickerInput
              id="date-picker-input-id-start"
              labelText={t("startDate", "Start date")}
              placeholder="DD-MM-YYYY"
              size="md"
            />
            <DatePickerInput
              id="date-picker-input-id-finish"
              labelText={t("endDate", "End date")}
              placeholder="DD-MM-YYYY"
              size="md"
            />
          </DatePicker>
        </Column>
      </div>
    </div>
  );
};
