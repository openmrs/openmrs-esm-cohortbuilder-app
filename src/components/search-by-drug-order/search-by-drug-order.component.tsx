import React, { useState } from "react";

import { showToast } from "@openmrs/esm-framework";
import { Column, Dropdown, MultiSelect } from "carbon-components-react";
import { useTranslation } from "react-i18next";

import { DropdownValue, SearchByProps } from "../../types";
import SearchButtonSet from "../search-button-set/search-button-set";
import { useCareSettings, useDrugs } from "./search-by-drug-order.resource";
import styles from "./search-by-location.style.scss";

const SearchByDrugOrder: React.FC<SearchByProps> = ({ onSubmit }) => {
  const { t } = useTranslation();
  const { drugs, drugsError } = useDrugs();
  const { careSettings, careSettingsError } = useCareSettings();
  const [selectedDrugs, setSelectedDrugs] = useState<DropdownValue[]>(null);
  const [selectedMethod, setSelectedCareSetting] =
    useState<DropdownValue>(null);
  const [isLoading, setIsLoading] = useState(false);

  if (drugsError) {
    showToast({
      title: t("error", "Error"),
      kind: "error",
      critical: true,
      description: drugsError?.message,
    });
  }

  if (careSettingsError) {
    showToast({
      title: t("error", "Error"),
      kind: "error",
      critical: true,
      description: careSettingsError?.message,
    });
  }

  const handleResetInputs = () => {
    setSelectedDrugs(null);
    setSelectedCareSetting(null);
  };

  const submit = async () => {
    setIsLoading(true);
    await onSubmit({}, "");
    setIsLoading(false);
  };

  return (
    <>
      <Column>
        <div>
          <MultiSelect
            id="drugs"
            data-testid="drugs"
            onChange={(data) => setSelectedDrugs(data.selectedItems)}
            items={drugs}
            label={t("selectLocations", "Select drugs")}
          />
        </div>
      </Column>
      <div className={styles.column}>
        <Column>
          <Dropdown
            id="careSettings"
            data-testid="careSettings"
            onChange={(data) => setSelectedCareSetting(data.selectedItem)}
            initialSelectedItem={careSettings[0]}
            items={careSettings}
            label={t("selectMethod", "Select a care setting")}
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

export default SearchByDrugOrder;
