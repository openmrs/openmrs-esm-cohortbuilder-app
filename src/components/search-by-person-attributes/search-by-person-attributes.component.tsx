import React, {
  Dispatch,
  SetStateAction,
  useCallback,
  useEffect,
  useState,
} from "react";

import { showNotification } from "@openmrs/esm-framework";
import { Column, Dropdown, TextInput } from "carbon-components-react";
import { useTranslation } from "react-i18next";

import { PersonAttribute, SearchParams } from "../../types";
import { getPersonAttributes } from "./search-by-person-attributes.resource";
import styles from "./search-by-person-attributes.style.scss";
import {
  getQueryDetails,
  getSearchByAttributesDescription,
} from "./search-by-person-attributes.utils";

interface SearchByPersonAttributesProps {
  setQueryDescription: Dispatch<SetStateAction<String>>;
  setSearchParams: Dispatch<SetStateAction<SearchParams>>;
  resetInputs: boolean;
}

export const SearchByPersonAttributes: React.FC<
  SearchByPersonAttributesProps
> = ({ setQueryDescription, setSearchParams, resetInputs }) => {
  const { t } = useTranslation();
  const [personAttributes, setPersonAttributes] = useState<PersonAttribute[]>(
    []
  );
  const [selectedAttributeValues, setSelectedAttributeValues] = useState([]);
  const [selectedAttributeId, setSelectedAttributeId] = useState<string>(null);

  useEffect(() => {
    if (resetInputs) {
      handleResetInputs();
    }
  }, [resetInputs]);

  const onPersonAttributesReceive = useCallback(async () => {
    try {
      setPersonAttributes(await getPersonAttributes());
    } catch (error) {
      showNotification({
        title: t("error", "Error"),
        kind: "error",
        critical: true,
        description: error?.message,
      });
    }
  }, [t]);

  useEffect(() => {
    onPersonAttributesReceive();
  }, [onPersonAttributesReceive]);

  const handleResetInputs = () => {
    setSelectedAttributeId(null);
    setSelectedAttributeValues([]);
  };

  const handleInputValues = useCallback(() => {
    setSearchParams(
      getQueryDetails(selectedAttributeId, selectedAttributeValues)
    );
    const selectedPersonAttribute = personAttributes.find(
      (personAttribute) => personAttribute.value == selectedAttributeId
    );
    setQueryDescription(
      getSearchByAttributesDescription(
        selectedPersonAttribute?.label,
        selectedAttributeValues
      )
    );
  }, [
    personAttributes,
    selectedAttributeId,
    selectedAttributeValues,
    setQueryDescription,
    setSearchParams,
  ]);

  useEffect(() => {
    handleInputValues();
  }, [handleInputValues]);

  return (
    <div className={styles.container}>
      <Column>
        <div>
          <Dropdown
            id="personAttributes"
            data-testid="personAttributes"
            onChange={(data) => setSelectedAttributeId(data.selectedItem.value)}
            initialSelectedItem={personAttributes[0]}
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
    </div>
  );
};
