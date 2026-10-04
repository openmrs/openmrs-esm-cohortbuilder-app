import React, { useEffect, useState } from 'react';
import { Column, Dropdown, TextInput } from '@carbon/react';
import { showSnackbar } from '@openmrs/esm-framework';
import { useTranslation } from 'react-i18next';

import { type SearchByProps } from '../../types';
import SearchButtonSet from '../search-button-set/search-button-set';
import { usePersonAttributes } from './search-by-person-attributes.resource';
import styles from './search-by-person-attributes.style.scss';
import { getQueryDetails, getSearchByAttributesDescription } from './search-by-person-attributes.utils';

const SearchByPersonAttributes: React.FC<SearchByProps> = ({ onSubmit }) => {
  const { t } = useTranslation();
  const { personAttributes, personAttributesError } = usePersonAttributes();
  const [attributeValuesInput, setAttributeValuesInput] = useState('');
  const [selectedAttributeId, setSelectedAttributeId] = useState<string>(null);
  const [isLoading, setIsLoading] = useState(false);
  const selectedAttribute =
    personAttributes.find((personAttribute) => personAttribute.value === selectedAttributeId) ?? null;

  useEffect(() => {
    if (personAttributesError) {
      showSnackbar({
        title: t('error', 'Error'),
        kind: 'error',
        isLowContrast: false,
        subtitle: personAttributesError?.message,
      });
    }
  }, [personAttributesError, t]);

  const handleResetInputs = () => {
    setSelectedAttributeId(null);
    setAttributeValuesInput('');
  };

  const submit = async () => {
    setIsLoading(true);
    const selectedAttributeValues = attributeValuesInput ? attributeValuesInput.trim().split(',') : [];
    try {
      await onSubmit(
        getQueryDetails(selectedAttributeId, selectedAttributeValues),
        getSearchByAttributesDescription(selectedAttribute?.label, selectedAttributeValues),
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Column>
        <div>
          <Dropdown
            id="personAttributes"
            data-testid="personAttributes"
            onChange={(data) => setSelectedAttributeId(data.selectedItem?.value ?? null)}
            selectedItem={selectedAttribute}
            items={personAttributes}
            label={t('selectAttribute', 'Select a person attribute')}
            titleText=""
          />
        </div>
      </Column>
      <div className={styles.column}>
        <Column>
          <TextInput
            id={'selectedAttributeValues'}
            data-testid={'selectedAttributeValues'}
            disabled={!selectedAttributeId}
            labelText={t('selectedAttributeValues', 'Enter Comma Delimited Values')}
            value={attributeValuesInput}
            onChange={(e) => setAttributeValuesInput(e.target.value)}
          />
        </Column>
      </div>
      <SearchButtonSet onHandleReset={handleResetInputs} onHandleSubmit={submit} isLoading={isLoading} />
    </>
  );
};

export default SearchByPersonAttributes;
