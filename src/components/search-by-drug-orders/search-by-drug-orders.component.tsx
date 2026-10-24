import React, { useEffect, useState } from 'react';
import { Column, Dropdown, MultiSelect } from '@carbon/react';
import { useTranslation } from 'react-i18next';
import { showSnackbar } from '@openmrs/esm-framework';
import type { DropdownValue, DrugOrderDetails, SearchByProps } from '../../types';
import { getDescription, getQueryDetails } from './search-by-drug-orders.utils';
import { useCareSettings, useDrugs } from './search-by-drug-orders.resources';
import SearchButtonSet from '../search-button-set/search-button-set';
import SearchDatePicker from '../search-date-picker/search-date-picker';
import styles from './search-by-drug-orders.style.scss';

const SearchByDrugOrder: React.FC<SearchByProps> = ({ onSubmit }) => {
  const { t } = useTranslation();
  const { drugs, drugsError } = useDrugs();
  const { careSettings, careSettingsError } = useCareSettings();
  const [activeOnOrAfter, setActiveOnOrAfter] = useState('');
  const [activeOnOrBefore, setActiveOnOrBefore] = useState('');
  const [activatedOnOrAfter, setActivatedOnOrAfter] = useState('');
  const [activatedOnOrBefore, setActivatedOnOrBefore] = useState('');
  const [selectedDrugs, setSelectedDrugs] = useState<DropdownValue[]>([]);
  const [selectedCareSetting, setSelectedCareSetting] = useState<DropdownValue>(null);
  const [isLoading, setIsLoading] = useState(false);

  const drugsErrorMessage = drugsError?.message;

  useEffect(() => {
    if (drugsErrorMessage) {
      showSnackbar({
        title: t('error', 'Error'),
        kind: 'error',
        isLowContrast: false,
        subtitle: drugsErrorMessage,
      });
    }
  }, [drugsErrorMessage, t]);

  const careSettingsErrorMessage = careSettingsError?.message;

  useEffect(() => {
    if (careSettingsErrorMessage) {
      showSnackbar({
        title: t('error', 'Error'),
        kind: 'error',
        isLowContrast: false,
        subtitle: careSettingsErrorMessage,
      });
    }
  }, [careSettingsErrorMessage, t]);

  const handleResetInputs = () => {
    setSelectedDrugs([]);
    setSelectedCareSetting(null);
    setActiveOnOrAfter('');
    setActiveOnOrBefore('');
    setActivatedOnOrAfter('');
    setActivatedOnOrBefore('');
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
    try {
      await onSubmit(getQueryDetails(drugOrderParams), getDescription(drugOrderParams));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Column>
        <div>
          <MultiSelect
            id="drugs"
            data-testid="drugs"
            onChange={(data) => setSelectedDrugs(data.selectedItems)}
            selectedItems={selectedDrugs}
            items={drugs}
            label={t('selectDrugs', 'Select drugs')}
          />
        </div>
      </Column>
      <div className={styles.column}>
        <Column>
          <Dropdown
            id="careSettings"
            data-testid="careSettings"
            onChange={(data) => setSelectedCareSetting(data.selectedItem)}
            selectedItem={selectedCareSetting}
            items={careSettings}
            label={t('selectCareSettings', 'Select a care setting')}
            titleText=""
          />
        </Column>
      </div>
      <div className={styles.column}>
        <Column>
          <SearchDatePicker
            id="activeOnOrAfter"
            labelText={t('using', 'Using between')}
            value={activeOnOrAfter}
            onChange={setActiveOnOrAfter}
          />
        </Column>
        <Column>
          <SearchDatePicker
            id="activeOnOrBefore"
            labelText={t('to', 'to')}
            value={activeOnOrBefore}
            onChange={setActiveOnOrBefore}
          />
        </Column>
      </div>
      <div className={styles.column}>
        <Column>
          <SearchDatePicker
            id="activatedOnOrAfter"
            labelText={t('used', 'Used between')}
            value={activatedOnOrAfter}
            onChange={setActivatedOnOrAfter}
          />
        </Column>
        <Column>
          <SearchDatePicker
            id="activatedOnOrBefore"
            labelText={t('and', 'and')}
            value={activatedOnOrBefore}
            onChange={setActivatedOnOrBefore}
          />
        </Column>
      </div>
      <SearchButtonSet onHandleReset={handleResetInputs} onHandleSubmit={submit} isLoading={isLoading} />
    </>
  );
};

export default SearchByDrugOrder;
