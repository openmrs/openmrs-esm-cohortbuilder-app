import React, { useEffect, useState } from "react";

import {
  DatePicker,
  DatePickerInput,
  Column,
  NumberInput,
  Dropdown,
  MultiSelect,
} from "carbon-components-react";
import dayjs from "dayjs";
import { useTranslation } from "react-i18next";

import { fetchLocations } from "../../cohort-builder.resource";
import { Form, SearchByProps, Location } from "../../types";
import SearchButtonSet from "../search-button-set/search-button-set";
import {
  fetchEncounterTypes,
  fetchForms,
} from "./search-by-encounters.resources";
import styles from "./search-by-encounters.style.scss";
import { getDescription, getQueryDetails } from "./search-by-encounters.utils";

const SearchByEncounters: React.FC<SearchByProps> = ({ onSubmit }) => {
  const { t } = useTranslation();
  const [atLeastCount, setAtLeastCount] = useState(0);
  const [atMostCount, setAtMostCount] = useState(0);
  const [encounters, setEncounters] = useState([]);
  const [selectedEncounterTypes, setSelectedEncounterTypes] = useState([]);
  const [encounterLocation, setEncounterLocation] = useState<Location>();
  const [encounterForm, setEncounterForm] = useState<Form>();
  const [locations, setLocations] = useState<Location[]>([]);
  const [forms, setForms] = useState<Form[]>([]);
  const [onOrBefore, setOnOrBefore] = useState("");
  const [onOrAfter, setOnOrAfter] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleDates = (dates: Date[]) => {
    setOnOrAfter(dayjs(dates[0]).format());
    setOnOrBefore(dayjs(dates[1]).format());
  };

  const fetchDropDownValues = async () => {
    setEncounters(await fetchEncounterTypes());
    setForms(await fetchForms());
    setLocations(await fetchLocations());
  };

  useEffect(() => {
    fetchDropDownValues();
  }, []);

  const reset = () => {
    setAtLeastCount(0);
    setAtMostCount(0);
    setOnOrBefore("");
    setOnOrAfter("");
  };

  const submit = async () => {
    setIsLoading(true);
    const encounterDetails = {
      onOrAfter,
      atLeastCount,
      atMostCount,
      encounterForm,
      encounterLocation,
      onOrBefore,
      selectedEncounterTypes,
    };
    await onSubmit(
      getQueryDetails(encounterDetails),
      getDescription(encounterDetails)
    );
    setIsLoading(false);
  };

  return (
    <div className={styles.container}>
      <Column>
        <div>
          <MultiSelect
            id="encounters"
            data-testid="encounters"
            onChange={(data) => setSelectedEncounterTypes(data.selectedItems)}
            items={encounters}
            titleText={t("selectAttribute", "Select a encounter type")}
            label={t("selectAttribute", "Select a encounter type")}
          />
        </div>
      </Column>
      <div className={styles.column}>
        <Column>
          <div>
            <Dropdown
              id="forms"
              data-testid="forms"
              onChange={(data) => setEncounterForm(data.selectedItem)}
              initialSelectedItem={forms[0]}
              items={forms}
              label={t("selectForm", "Select a form")}
            />
          </div>
        </Column>
        <Column>
          <div>
            <Dropdown
              id="locations"
              data-testid="locations"
              onChange={(data) => setEncounterLocation(data.selectedItem)}
              initialSelectedItem={locations[0]}
              items={locations}
              label={t("selectLocation", "Select a location")}
            />
          </div>
        </Column>
      </div>
      <div className={styles.column}>
        {/* <Column md={2}>
          <p className={styles.text}>{t("age", "Age")}</p>
        </Column> */}
        <Column className={styles.age}>
          <div className={styles.multipleInputs}>
            <NumberInput
              id="atLeastCount"
              data-testid="atLeastCount"
              label={t("atLeast", "at least many")}
              min={0}
              size="sm"
              value={atLeastCount}
              onChange={(event) => setAtLeastCount(event.imaginaryTarget.value)}
            />
          </div>
          <div className={styles.multipleInputs}>
            <NumberInput
              id="atMostCount"
              data-testid="atMostCount"
              label={t("upto", "upto this many")}
              min={0}
              size="sm"
              value={atMostCount}
              onChange={(event) => setAtMostCount(event.imaginaryTarget.value)}
            />
          </div>
        </Column>
      </div>
      <div className={styles.column}>
        <Column>
          <DatePicker
            datePickerType="range"
            dateFormat="d-m-Y"
            allowInput={false}
            onChange={(dates: Date[]) => handleDates(dates)}
          >
            <DatePickerInput
              id="date-picker-input-id-start"
              labelText={t("from", "From")}
              placeholder="DD-MM-YYYY"
              size="md"
            />
            <DatePickerInput
              id="date-picker-input-id-finish"
              labelText={t("to", "to")}
              placeholder="DD-MM-YYYY"
              size="md"
            />
          </DatePicker>
        </Column>
      </div>
      <SearchButtonSet
        isLoading={isLoading}
        onHandleSubmit={submit}
        onHandleReset={reset}
      />
    </div>
  );
};

export default SearchByEncounters;
