import React, { useState } from "react";

import {
  DatePicker,
  DatePickerInput,
  Column,
  NumberInput,
  MultiSelect,
} from "@carbon/react";
import { showToast } from "@openmrs/esm-framework";
import dayjs from "dayjs";
import { useTranslation } from "react-i18next";

import { useLocations } from "../../cohort-builder.resources";
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
  const [selectedEncounterTypes, setSelectedEncounterTypes] = useState<
    DropdownValue[]
  >([]);
  const [encounterLocations, setEncounterLocations] = useState<DropdownValue[]>(
    []
  );
  const [encounterForms, setEncounterForms] = useState<DropdownValue[]>([]);
  const { locations, locationsError } = useLocations();
  const { forms, formsError } = useForms();
  const [onOrBefore, setOnOrBefore] = useState("");
  const [onOrAfter, setOnOrAfter] = useState("");
  const [isLoading, setIsLoading] = useState(false);

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
      encounterForms,
      encounterLocations,
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
            label={t("selectEncounterTypes", "Select encounter types")}
          />
        </div>
      </Column>
      <MultiSelect
        id="forms"
        data-testid="forms"
        onChange={(data) => setEncounterForms(data.selectedItems)}
        items={forms}
        label={t("selectForms", "Select forms")}
      />

      <MultiSelect
        id="locations"
        data-testid="locations"
        onChange={(data) => setEncounterLocations(data.selectedItems)}
        items={locations}
        label={t("selectLocations", "Select locations")}
      />
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
              onChange={(event, { value }) => setAtLeastCount(value)}
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
              onChange={(event, { value }) => setAtMostCount(value)}
            />
          </div>
        </Column>
      </div>
      <div className={styles.column}>
        <Column>
          <DatePicker
            datePickerType="single"
            allowInput={false}
            onChange={(date) => setOnOrAfter(dayjs(date[0]).format())}
          >
            <DatePickerInput
              id="onOrAfter"
              labelText={t("from", "From")}
              value={onOrAfter && dayjs(onOrAfter).format("DD-MM-YYYY")}
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
              id="onOrBefore"
              value={onOrBefore && dayjs(onOrBefore).format("DD-MM-YYYY")}
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
