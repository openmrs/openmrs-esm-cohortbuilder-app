import React, { useState } from "react";

import {
  DatePicker,
  DatePickerInput,
  Column,
  Dropdown,
  NumberInput,
  Switch,
  ContentSwitcher,
} from "@carbon/react";
import dayjs from "dayjs";
import { useTranslation } from "react-i18next";

import {
  composeJson,
  queryDescriptionBuilder,
} from "../../cohort-builder.utils";
import { Concept, SearchByProps } from "../../types";
import SearchButtonSet from "../search-button-set/search-button-set";
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

const types = {
  CWE: "codedObsSearchAdvanced",
  NM: "numericObsSearchAdvanced",
  DT: "dateObsSearchAdvanced",
  ST: "dateObsSearchAdvanced",
  TS: "textObsSearchAdvanced",
  ZZ: "codedObsSearchAdvanced",
  BIT: "codedObsSearchAdvanced",
};

const SearchByConcepts: React.FC<SearchByProps> = ({ onSubmit }) => {
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
  const [isLoading, setIsLoading] = useState(false);

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

  const reset = () => {
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

  const getOnOrBefore = () => {
    if (lastDays > 0 || lastMonths > 0) {
      return dayjs()
        .subtract(lastDays, "days")
        .subtract(lastMonths, "months")
        .format();
    }
  };

  const submit = async () => {
    setIsLoading(true);
    const observations: Observation = {
      modifier: "",
      operator1: operator,
      value1: operatorValue > 0 ? operatorValue.toString() : "",
      question: concept.uuid,
      onOrBefore: getOnOrBefore() || onOrBefore,
      onOrAfter,
      timeModifier,
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
    await onSubmit(
      composeJson(params),
      queryDescriptionBuilder(observations, concept.name)
    );
    setIsLoading(false);
  };

  return (
    <>
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
                    value={operatorValue}
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
        <Column className={styles.dateRange}>
          <Column>
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
          </Column>
          <Column>
            <NumberInput
              label={t("lastDays", "and / or days")}
              id="last-days"
              data-testid="last-days"
              invalidText={t("numberIsNotValid", "Number is not valid")}
              min={0}
              size="sm"
              value={lastDays}
              onChange={(event) => setLastDays(event.imaginaryTarget.value)}
            />
          </Column>
        </Column>
        <div className={styles.dateRange}>
          <Column>
            <DatePicker
              datePickerType="single"
              allowInput={false}
              onChange={(date) => setOnOrAfter(dayjs(date[0]).format())}
            >
              <DatePickerInput
                id="startDate"
                value={onOrAfter && dayjs(onOrAfter).format("DD-MM-YYYY")}
                labelText={t("dateRange", "Date range start date")}
                placeholder="DD-MM-YYYY"
                size="md"
              />
            </DatePicker>
          </Column>
          <Column>
            <DatePicker
              datePickerType="single"
              allowInput={false}
              onChange={(date) => setOnOrBefore(dayjs(date[0]).format())}
            >
              <DatePickerInput
                id="endDate"
                value={onOrBefore && dayjs(onOrBefore).format("DD-MM-YYYY")}
                labelText={t("endDate", "End date")}
                placeholder="DD-MM-YYYY"
                size="md"
              />
            </DatePicker>
          </Column>
        </div>
      </div>
      <SearchButtonSet
        isLoading={isLoading}
        onHandleSubmit={submit}
        onHandleReset={reset}
      />
    </>
  );
};

export default SearchByConcepts;
