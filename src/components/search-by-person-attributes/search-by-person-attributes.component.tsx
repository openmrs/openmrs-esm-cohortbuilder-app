import React, { useEffect, useState } from "react";

import { showNotification } from "@openmrs/esm-framework";
import { Column, Dropdown, TextInput } from "carbon-components-react";
import { useTranslation } from "react-i18next";

import { PersonAttribute, SearchByProps } from "../../types";
import SearchButtonSet from "../search-button-set/search-button-set";
import { getPersonAttributes } from "./search-by-person-attributes.resource";
import styles from "./search-by-person-attributes.style.scss";
import {
  getQueryDetails,
  getSearchByAttributesDescription,
} from "./search-by-person-attributes.utils";

const SearchByPersonAttributes: React.FC<SearchByProps> = ({
  onSubmit,
  isLoading,
}) => {
  const { t } = useTranslation();
  const [personAttributes, setPersonAttributes] = useState<PersonAttribute[]>(
    []
  );
  const [selectedAttributeValues, setSelectedAttributeValues] = useState([]);
  const [selectedAttributeId, setSelectedAttributeId] = useState<string>(null);

  const onPersonAttributesReceive = async () => {
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
  };

  useEffect(() => {
    onPersonAttributesReceive();
  }, []);

  const handleResetInputs = () => {
    setSelectedAttributeId(null);
    setSelectedAttributeValues([]);
  };

  const submit = () => {
    const selectedPersonAttribute = personAttributes.find(
      (personAttribute) => personAttribute.value == selectedAttributeId
    );
    onSubmit(
      getQueryDetails(selectedAttributeId, selectedAttributeValues),
      getSearchByAttributesDescription(
        selectedPersonAttribute?.label,
        selectedAttributeValues
      )
    );
  };

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
      <SearchButtonSet
        onHandleReset={handleResetInputs}
        onHandleSubmit={submit}
        isLoading={isLoading}
      />
    </div>
  );
};

export default SearchByPersonAttributes;
