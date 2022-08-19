import React, { useState } from "react";

import { Column, Dropdown, MultiSelect } from "@carbon/react";
import { showToast } from "@openmrs/esm-framework";
import { useTranslation } from "react-i18next";

import { useLocations } from "../../cohort-builder.resource";
import { DropdownValue, SearchByProps } from "../../types";
import SearchButtonSet from "../search-button-set/search-button-set";
import styles from "./search-by-location.style.scss";
import { getQueryDetails, getDescription } from "./search-by-location.utils";

const SearchByLocation: React.FC<SearchByProps> = ({ onSubmit }) => {
  const { t } = useTranslation();
  const methods = [
    {
      id: 0,
      label: t("anyEncounter", "Any Encounter"),
      value: "ANY",
    },
    {
      id: 1,
      label: t("mostRecentEncounter", "Most Recent Encounter"),
      value: "LAST",
    },
    {
      id: 2,
      label: t("earliestEncounter", "Earliest Encounter"),
      value: "FIRST",
    },
  ];
  const { locations, locationsError } = useLocations();
  const [selectedLocations, setSelectedLocations] =
    useState<DropdownValue[]>(null);
  const [selectedMethod, setSelectedMethod] = useState<DropdownValue>(
    methods[0]
  );
  const [isLoading, setIsLoading] = useState(false);

  if (locationsError) {
    showToast({
      title: t("error", "Error"),
      kind: "error",
      critical: true,
      description: locationsError?.message,
    });
  }

  const handleResetInputs = () => {
    setSelectedLocations(null);
    setSelectedMethod(null);
  };

  const submit = async () => {
    setIsLoading(true);
    await onSubmit(
      getQueryDetails(selectedMethod.value, selectedLocations),
      getDescription(selectedMethod.label, selectedLocations)
    );
    setIsLoading(false);
  };

  return (
    <>
      <Column>
        <div>
          <MultiSelect
            id="locations"
            data-testid="locations"
            onChange={(data) => setSelectedLocations(data.selectedItems)}
            items={locations}
            label={t("selectLocations", "Select locations")}
          />
        </div>
      </Column>
      <div className={styles.column}>
        <Column>
          <Dropdown
            id="methods"
            data-testid="methods"
            onChange={(data) => setSelectedMethod(data.selectedItem)}
            initialSelectedItem={methods[0]}
            items={methods}
            label={t("selectMethod", "Select a method")}
          />
        </Column>
      </div>
      <SearchButtonSet
        onHandleReset={handleResetInputs}
        onHandleSubmit={submit}
        isLoading={isLoading}
      />
    </>
  );
};

export default SearchByLocation;
