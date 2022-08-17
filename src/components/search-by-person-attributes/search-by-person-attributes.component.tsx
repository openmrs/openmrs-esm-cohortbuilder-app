import React, { useState } from "react";

import { Column, Dropdown, TextInput } from "@carbon/react";
import { showToast } from "@openmrs/esm-framework";
import { useTranslation } from "react-i18next";

import { SearchByProps } from "../../types";
import SearchButtonSet from "../search-button-set/search-button-set";
import { usePersonAttributes } from "./search-by-person-attributes.resource";
import styles from "./search-by-person-attributes.style.scss";
import {
  getQueryDetails,
  getSearchByAttributesDescription,
} from "./search-by-person-attributes.utils";

const SearchByPersonAttributes: React.FC<SearchByProps> = ({ onSubmit }) => {
  const { t } = useTranslation();
  const { personAttributes, personAttributesError } = usePersonAttributes();
  const [selectedAttributeValues, setSelectedAttributeValues] = useState([]);
  const [selectedAttributeId, setSelectedAttributeId] = useState<string>(null);
  const [isLoading, setIsLoading] = useState(false);

  if (personAttributesError) {
    showToast({
      title: t("error", "Error"),
      kind: "error",
      critical: true,
      description: personAttributesError?.message,
    });
  }

  const handleResetInputs = () => {
    setSelectedAttributeId(null);
    setSelectedAttributeValues([]);
  };

  const submit = async () => {
    setIsLoading(true);
    const selectedPersonAttribute = personAttributes?.find(
      (personAttribute) => personAttribute.value == selectedAttributeId
    );
    await onSubmit(
      getQueryDetails(selectedAttributeId, selectedAttributeValues),
      getSearchByAttributesDescription(
        selectedPersonAttribute?.label,
        selectedAttributeValues
      )
    );
    setIsLoading(false);
  };

  return (
    <>
      <Column>
        <div>
          <Dropdown
            id="personAttributes"
            data-testid="personAttributes"
            onChange={(data) => setSelectedAttributeId(data.selectedItem.value)}
            items={personAttributes}
            label={t("selectAttribute", "Select a person attribute")}
          />
        </div>
      </Column>
      <div className={styles.column}>
        <Column>
          <TextInput
            id={"selectedAttributeValues"}
            data-testid={"selectedAttributeValues"}
            disabled={!selectedAttributeId}
            labelText={t(
              "selectedAttributeValues",
              "Enter Comma Delimited Values"
            )}
            onChange={(e) =>
              setSelectedAttributeValues(e.target.value.trim().split(","))
            }
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

export default SearchByPersonAttributes;
