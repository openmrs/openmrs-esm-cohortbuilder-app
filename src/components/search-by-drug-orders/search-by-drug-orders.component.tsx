import React, { useState } from 'react';
import dayjs from 'dayjs';
import { Column, DatePicker, DatePickerInput, Dropdown, MultiSelect } from '@carbon/react';
import { useTranslation } from 'react-i18next';
import { showSnackbar } from '@openmrs/esm-framework';
import type { DropdownValue, DrugOrderDetails, SearchByProps } from '../../types';
import { getDescription, getQueryDetails } from './search-by-drug-orders.utils';
import { useCareSettings, useDrugs } from './search-by-drug-orders.resources';
import SearchButtonSet from '../search-button-set/search-button-set';
import styles from './search-by-drug-orders.style.scss';

const SearchByDrugOrder: React.FC<SearchByProps> = ({ onSubmit }) => {
  const { t } = useTranslation();
  const { drugs, drugsError } = useDrugs();
  const { careSettings, careSettingsError } = useCareSettings();
  const [activeOnOrAfter, setActiveOnOrAfter] = useState('');
  const [activeOnOrBefore, setActiveOnOrBefore] = useState('');
  const [activatedOnOrAfter, setActivatedOnOrAfter] = useState('');
  const [activatedOnOrBefore, setActivatedOnOrBefore] = useState('');
  const [selectedDrugs, setSelectedDrugs] = useState<DropdownValue[]>(null);
  const [selectedCareSetting, setSelectedCareSetting] = useState<DropdownValue>(null);
  const [isLoading, setIsLoading] = useState(false);

  if (drugsError) {
    showSnackbar({
      title: t('error', 'Error'),
      kind: 'error',
      isLowContrast: false,
      subtitle: drugsError?.message,
    });
  }

  if (careSettingsError) {
    showSnackbar({
      title: t('error', 'Error'),
      kind: 'error',
      isLowContrast: false,
      subtitle: careSettingsError?.message,
    });
  }

  const handleResetInputs = () => {
    setSelectedDrugs(null);
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
    await onSubmit(getQueryDetails(drugOrderParams), getDescription(drugOrderParams));
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
            initialSelectedItem={careSettings[0]}
            items={careSettings}
            label={t('selectCareSettings', 'Select a care setting')}
            titleText=""
          />
        </Column>
      </div>
      <div className={styles.column}>
        <Column>
          <DatePicker
            datePickerType="single"
            allowInput={false}
            onChange={(date) => setActiveOnOrAfter(dayjs(date[0]).format())}
            value={activeOnOrAfter && dayjs(activeOnOrAfter).format('DD-MM-YYYY')}
          >
            <DatePickerInput
              id="activeOnOrAfter"
              labelText={t('using', 'Using between')}
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
            value={activeOnOrBefore && dayjs(activeOnOrBefore).format('DD-MM-YYYY')}
          >
            <DatePickerInput id="activeOnOrBefore" labelText={t('to', 'to')} placeholder="DD-MM-YYYY" size="md" />
          </DatePicker>
        </Column>
      </div>
      <div className={styles.column}>
        <Column>
          <DatePicker
            datePickerType="single"
            allowInput={false}
            onChange={(date) => setActivatedOnOrAfter(dayjs(date[0]).format())}
            value={activatedOnOrAfter && dayjs(activatedOnOrAfter).format('DD-MM-YYYY')}
          >
            <DatePickerInput
              id="activatedOnOrAfter"
              labelText={t('used', 'Used between')}
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
            value={activatedOnOrBefore && dayjs(activatedOnOrBefore).format('DD-MM-YYYY')}
          >
            <DatePickerInput id="activatedOnOrBefore" labelText={t('and', 'and')} placeholder="DD-MM-YYYY" size="md" />
          </DatePicker>
        </Column>
      </div>
      <SearchButtonSet onHandleReset={handleResetInputs} onHandleSubmit={submit} isLoading={isLoading} />
    </>
  );
};

export default SearchByDrugOrder;
