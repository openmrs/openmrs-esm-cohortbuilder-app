import React, { useEffect, useState } from "react";

import { showNotification } from "@openmrs/esm-framework";
import { Column, Dropdown } from "carbon-components-react";
import { useTranslation } from "react-i18next";

import { fetchLocations } from "../../cohort-builder.resource";
import { DropdownValue, Location, SearchByProps } from "../../types";
import SearchButtonSet from "../search-button-set/search-button-set";
import styles from "./search-by-location.style.scss";
import { getQueryDetails, getDescription } from "./search-by-location.utils";

const SearchByLocation: React.FC<SearchByProps> = ({ onSubmit }) => {
  const { t } = useTranslation();
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<Location>(null);
  const [selectedMethod, setSelectedMethod] = useState<DropdownValue>(null);
  const [isLoading, setIsLoading] = useState(false);

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

  const getLocations = async () => {
    try {
      setLocations(await fetchLocations());
    } catch (error) {
      showNotification({
        title: t("error", "Error"),
        kind: "error",
        critical: true,
        description: error?.message,
      });
    }
  };

  useEffect(() => {
    getLocations();
  }, []);

  const handleResetInputs = () => {
    setSelectedLocation(null);
    setSelectedMethod(null);
  };

  const submit = async () => {
    setIsLoading(true);
    await onSubmit(
      getQueryDetails(selectedMethod.value, selectedLocation),
      getDescription(selectedMethod.label, selectedLocation)
    );
    setIsLoading(false);
  };

  return (
    <div className={styles.container}>
      <Column>
        <div>
          <Dropdown
            id="locations"
            data-testid="locations"
            onChange={(data) => setSelectedLocation(data.selectedItem)}
            initialSelectedItem={locations[0]}
            items={locations}
            label={t("selectLocation", "Select a location")}
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
    </div>
  );
};

export default SearchByLocation;
