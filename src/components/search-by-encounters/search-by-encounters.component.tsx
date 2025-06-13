import React, { useState } from 'react';
import dayjs from 'dayjs';
import { DatePicker, DatePickerInput, Column, NumberInput, MultiSelect } from '@carbon/react';
import { useTranslation } from 'react-i18next';
import { showSnackbar } from '@openmrs/esm-framework';
import { useLocations } from '../../cohort-builder.resources';
import type { SearchByProps, DropdownValue } from '../../types';
import { getDescription, getQueryDetails } from './search-by-encounters.utils';
import { useEncounterTypes, useForms } from './search-by-encounters.resources';
import SearchButtonSet from '../search-button-set/search-button-set';
import styles from './search-by-encounters.style.scss';

const SearchByEncounters: React.FC<SearchByProps> = ({ onSubmit }) => {
  const { t } = useTranslation();
  const [atLeastCount, setAtLeastCount] = useState(0);
  const [atMostCount, setAtMostCount] = useState(0);
  const { encounterTypes, encounterTypesError } = useEncounterTypes();
  const [selectedEncounterTypes, setSelectedEncounterTypes] = useState<DropdownValue[]>([]);
  const [encounterLocations, setEncounterLocations] = useState<DropdownValue[]>([]);
  const [encounterForms, setEncounterForms] = useState<DropdownValue[]>([]);
  const { locations, locationsError } = useLocations();
  const { forms, formsError } = useForms();
  const [onOrBefore, setOnOrBefore] = useState('');
  const [onOrAfter, setOnOrAfter] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (locationsError) {
    showSnackbar({
      title: t('error', 'Error'),
      kind: 'error',
      isLowContrast: false,
      subtitle: locationsError?.message,
    });
  }

  if (formsError) {
    showSnackbar({
      title: t('error', 'Error'),
      kind: 'error',
      isLowContrast: false,
      subtitle: formsError?.message,
    });
  }

  if (encounterTypesError) {
    showSnackbar({
      title: t('error', 'Error'),
      kind: 'error',
      isLowContrast: false,
      subtitle: encounterTypesError?.message,
    });
  }

  const reset = () => {
    setAtLeastCount(0);
    setAtMostCount(0);
    setOnOrBefore('');
    setOnOrAfter('');
  };

  const submit = async () => {
    setIsLoading(true);
    const encounterDetails = {
      onOrAfter,
      atLeastCount,
      atMostCount,
      encounterForms,
      encounterLocations,
      onOrBefore,
      selectedEncounterTypes,
    };
    await onSubmit(getQueryDetails(encounterDetails), getDescription(encounterDetails));
    setIsLoading(false);
  };

  return (
    <>
      <Column>
        <div>
          <MultiSelect
            id="encounters"
            onChange={(data) => setSelectedEncounterTypes(data.selectedItems)}
            items={encounterTypes}
            label={t('selectEncounterTypes', 'Select encounter types')}
          />
        </div>
      </Column>
      <MultiSelect
        id="forms"
        data-testid="forms"
        onChange={(data) => setEncounterForms(data.selectedItems)}
        items={forms}
        label={t('selectForms', 'Select forms')}
      />

      <MultiSelect
        id="locations"
        onChange={(data) => setEncounterLocations(data.selectedItems)}
        items={locations}
        label={t('selectLocations', 'Select locations')}
      />
      <div className={styles.column}>
        <Column className={styles.encounterRange}>
          <div className={styles.multipleInputs}>
            <NumberInput
              hideSteppers
              id="atLeastCount"
              data-testid="atLeastCount"
              label={t('atLeast', 'at least')}
              min={0}
              size="sm"
              value={atLeastCount}
              onChange={(event, { value }) => setAtLeastCount(Number(value))}
            />
          </div>
          <div className={styles.multipleInputs}>
            <NumberInput
              hideSteppers
              id="atMostCount"
              data-testid="atMostCount"
              label={t('upto', 'upto this many')}
              min={0}
              size="sm"
              value={atMostCount}
              onChange={(event, { value }) => setAtMostCount(Number(value))}
            />
          </div>
        </Column>
      </div>
      <div className={styles.column}>
        <Column>
          <DatePicker
            datePickerType="single"
            allowInput={false}
            onChange={(date) => setOnOrAfter(dayjs(date[0]).format())}
            value={onOrAfter && dayjs(onOrAfter).format('DD-MM-YYYY')}
          >
            <DatePickerInput id="onOrAfter" labelText={t('from', 'From')} placeholder="DD-MM-YYYY" size="md" />
          </DatePicker>
        </Column>
        <Column>
          <DatePicker
            datePickerType="single"
            allowInput={false}
            onChange={(date) => setOnOrBefore(dayjs(date[0]).format())}
            value={onOrBefore && dayjs(onOrBefore).format('DD-MM-YYYY')}
          >
            <DatePickerInput id="onOrBefore" labelText={t('to', 'to')} placeholder="DD-MM-YYYY" size="md" />
          </DatePicker>
        </Column>
      </div>
      <SearchButtonSet isLoading={isLoading} onHandleSubmit={submit} onHandleReset={reset} />
    </>
  );
};

export default SearchByEncounters;
