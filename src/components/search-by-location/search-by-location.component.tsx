import React, { useState } from 'react';
import { Column, Dropdown, MultiSelect } from '@carbon/react';
import { showSnackbar } from '@openmrs/esm-framework';

import { useTranslation } from 'react-i18next';
import { useLocations } from '../../cohort-builder.resources';
import { type DropdownValue, type SearchByProps } from '../../types';
import { getQueryDetails, getDescription } from './search-by-location.utils';
import SearchButtonSet from '../search-button-set/search-button-set';
import styles from './search-by-location.style.scss';

const SearchByLocation: React.FC<SearchByProps> = ({ onSubmit }) => {
  const { t } = useTranslation();
  const methods = [
    {
      id: 0,
      label: t('anyEncounter', 'Any Encounter'),
      value: 'ANY',
    },
    {
      id: 1,
      label: t('mostRecentEncounter', 'Most Recent Encounter'),
      value: 'LAST',
    },
    {
      id: 2,
      label: t('earliestEncounter', 'Earliest Encounter'),
      value: 'FIRST',
    },
  ];
  const { locations, locationsError } = useLocations();
  const [selectedLocations, setSelectedLocations] = useState<DropdownValue[]>(null);
  const [selectedMethod, setSelectedMethod] = useState<DropdownValue>(methods[0]);
  const [isLoading, setIsLoading] = useState(false);

  if (locationsError) {
    showSnackbar({
      title: t('error', 'Error'),
      kind: 'error',
      isLowContrast: false,
      subtitle: locationsError?.message,
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
      getDescription(selectedMethod.label, selectedLocations),
    );
    setIsLoading(false);
  };

  return (
    <>
      <Column>
        <div>
          <MultiSelect
            aria-label={t('selectLocations', 'Select locations')}
            id="locations"
            data-testid="locations"
            onChange={(data) => setSelectedLocations(data.selectedItems)}
            items={locations}
            label={t('selectLocations', 'Select locations')}
            placeholder={t('searchForALocation', 'Search for a location')}
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
            label={t('selectMethod', 'Select a method')}
            titleText=""
          />
        </Column>
      </div>
      <SearchButtonSet onHandleReset={handleResetInputs} onHandleSubmit={submit} isLoading={isLoading} />
    </>
  );
};

export default SearchByLocation;
