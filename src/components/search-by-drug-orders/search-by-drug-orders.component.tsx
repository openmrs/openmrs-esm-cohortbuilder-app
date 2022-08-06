import React, { useState } from "react";

import { showToast } from "@openmrs/esm-framework";
import {
  Column,
  DatePicker,
  DatePickerInput,
  Dropdown,
  MultiSelect,
} from "carbon-components-react";
import dayjs from "dayjs";
import { useTranslation } from "react-i18next";

import { DropdownValue, DrugOrderDetails, SearchByProps } from "../../types";
import SearchButtonSet from "../search-button-set/search-button-set";
import { useCareSettings, useDrugs } from "./search-by-drug-orders.resource";
import styles from "./search-by-drug-orders.style.scss";
import { getDescription, getQueryDetails } from "./search-by-drug-orders.utils";

const SearchByDrugOrder: React.FC<SearchByProps> = ({ onSubmit }) => {
  const { t } = useTranslation();
  const { drugs, drugsError } = useDrugs();
  const { careSettings, careSettingsError } = useCareSettings();
  const [activeOnOrAfter, setActiveOnOrAfter] = useState("");
  const [activeOnOrBefore, setActiveOnOrBefore] = useState("");
  const [activatedOnOrAfter, setActivatedOnOrAfter] = useState("");
  const [activatedOnOrBefore, setActivatedOnOrBefore] = useState("");
  const [selectedDrugs, setSelectedDrugs] = useState<DropdownValue[]>(null);
  const [selectedCareSetting, setSelectedCareSetting] =
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
    setActiveOnOrAfter("");
    setActiveOnOrBefore("");
    setActivatedOnOrAfter("");
    setActivatedOnOrBefore("");
  };

  const submit = async () => {
    setIsLoading(true);
    const drugOrderParams: DrugOrderDetails = {
      selectedDrugs,
      selectedCareSetting,
      activeOnOrAfter,
      activeOnOrBefore,
      activatedOnOrAfter,
      activatedOnOrBefore,
    };
    await onSubmit(
      getQueryDetails(drugOrderParams),
      getDescription(drugOrderParams)
    );
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
      <div className={styles.column}>
        <Column>
          <DatePicker
            datePickerType="single"
            allowInput={false}
            onChange={(date) => setActiveOnOrAfter(dayjs(date[0]).format())}
          >
            <DatePickerInput
              id="activeOnOrAfter"
              labelText={t("using", "Using between")}
              value={
                activeOnOrAfter && dayjs(activeOnOrAfter).format("DD-MM-YYYY")
              }
              placeholder="DD-MM-YYYY"
              size="md"
            />
          </DatePicker>
        </Column>
        <Column>
          <DatePicker
            datePickerType="single"
            allowInput={false}
            onChange={(date) => setActiveOnOrBefore(dayjs(date[0]).format())}
          >
            <DatePickerInput
              id="activeOnOrBefore"
              value={
                activeOnOrBefore && dayjs(activeOnOrBefore).format("DD-MM-YYYY")
              }
              labelText={t("to", "to")}
              placeholder="DD-MM-YYYY"
              size="md"
            />
          </DatePicker>
        </Column>
      </div>
      <div className={styles.column}>
        <Column>
          <DatePicker
            datePickerType="single"
            allowInput={false}
            onChange={(date) => setActivatedOnOrAfter(dayjs(date[0]).format())}
          >
            <DatePickerInput
              id="activatedOnOrAfter"
              labelText={t("used", "Used between")}
              value={
                activatedOnOrAfter &&
                dayjs(activatedOnOrAfter).format("DD-MM-YYYY")
              }
              placeholder="DD-MM-YYYY"
              size="md"
            />
          </DatePicker>
        </Column>
        <Column>
          <DatePicker
            datePickerType="single"
            allowInput={false}
            onChange={(date) => setActivatedOnOrBefore(dayjs(date[0]).format())}
          >
            <DatePickerInput
              id="activatedOnOrBefore"
              value={
                activatedOnOrBefore &&
                dayjs(activatedOnOrBefore).format("DD-MM-YYYY")
              }
              labelText={t("and", "and")}
              placeholder="DD-MM-YYYY"
              size="md"
            />
          </DatePicker>
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
