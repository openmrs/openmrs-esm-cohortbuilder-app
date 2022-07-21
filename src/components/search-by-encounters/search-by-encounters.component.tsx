import React, { useState } from "react";

import { showToast } from "@openmrs/esm-framework";
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

import { useLocations } from "../../cohort-builder.resource";
import { SearchByProps, DropdownValue } from "../../types";
import SearchButtonSet from "../search-button-set/search-button-set";
import { useEncounterTypes, useForms } from "./search-by-encounters.resources";
import styles from "./search-by-encounters.style.scss";
import { getDescription, getQueryDetails } from "./search-by-encounters.utils";

const SearchByEncounters: React.FC<SearchByProps> = ({ onSubmit }) => {
  const { t } = useTranslation();
  const [atLeastCount, setAtLeastCount] = useState(0);
  const [atMostCount, setAtMostCount] = useState(0);
  const { encounterTypes, encounterTypesError } = useEncounterTypes();
  const [selectedEncounterTypes, setSelectedEncounterTypes] = useState([]);
  const [encounterLocation, setEncounterLocation] = useState<DropdownValue>();
  const [encounterForm, setEncounterForm] = useState<DropdownValue>();
  const { locations, locationsError } = useLocations();
  const { forms, formsError } = useForms();
  const [onOrBefore, setOnOrBefore] = useState("");
  const [onOrAfter, setOnOrAfter] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleDatesChange = (dates: Date[]) => {
    setOnOrAfter(dayjs(dates[0]).format());
    setOnOrBefore(dayjs(dates[1]).format());
  };

  if (locationsError) {
    showToast({
      title: t("error", "Error"),
      kind: "error",
      critical: true,
      description: locationsError?.message,
    });
  }

  if (formsError) {
    showToast({
      title: t("error", "Error"),
      kind: "error",
      critical: true,
      description: formsError?.message,
    });
  }

  if (encounterTypesError) {
    showToast({
      title: t("error", "Error"),
      kind: "error",
      critical: true,
      description: encounterTypesError?.message,
    });
  }

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
    <>
      <Column>
        <div>
          <MultiSelect
            id="encounters"
            data-testid="encounters"
            onChange={(data) => setSelectedEncounterTypes(data.selectedItems)}
            items={encounterTypes}
            label={t("selectEncounterType", "Select an encounter type")}
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
              items={locations}
              label={t("selectLocation", "Select a location")}
            />
          </div>
        </Column>
      </div>
      <div className={styles.column}>
        <Column className={styles.encounterRange}>
          <div className={styles.multipleInputs}>
            <NumberInput
              id="atLeastCount"
              data-testid="atLeastCount"
              label={t("atLeast", "at least")}
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
            onChange={(dates: Date[]) => handleDatesChange(dates)}
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
    </>
  );
};

export default SearchByEncounters;
