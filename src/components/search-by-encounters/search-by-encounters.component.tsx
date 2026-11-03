import React, { useEffect, useState } from 'react';
import { Column, NumberInput, MultiSelect } from '@carbon/react';
import { useTranslation } from 'react-i18next';
import { showSnackbar } from '@openmrs/esm-framework';
import { useLocations } from '../../cohort-builder.resources';
import { withSelectedItems } from '../../cohort-builder.utils';
import type { SearchByProps, DropdownValue } from '../../types';
import { getDescription, getQueryDetails } from './search-by-encounters.utils';
import { useEncounterTypes, useForms } from './search-by-encounters.resources';
import SearchButtonSet from '../search-button-set/search-button-set';
import SearchDatePicker from '../search-date-picker/search-date-picker';
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
  const encounterTypeOptions = withSelectedItems(encounterTypes, selectedEncounterTypes);
  const formOptions = withSelectedItems(forms, encounterForms);
  const locationOptions = withSelectedItems(locations, encounterLocations);
  const [isLoading, setIsLoading] = useState(false);

  const locationsErrorMessage = locationsError?.message;

  useEffect(() => {
    if (locationsErrorMessage) {
      showSnackbar({
        title: t('error', 'Error'),
        kind: 'error',
        isLowContrast: false,
        subtitle: locationsErrorMessage,
      });
    }
  }, [locationsErrorMessage, t]);

  const formsErrorMessage = formsError?.message;

  useEffect(() => {
    if (formsErrorMessage) {
      showSnackbar({
        title: t('error', 'Error'),
        kind: 'error',
        isLowContrast: false,
        subtitle: formsErrorMessage,
      });
    }
  }, [formsErrorMessage, t]);

  const encounterTypesErrorMessage = encounterTypesError?.message;

  useEffect(() => {
    if (encounterTypesErrorMessage) {
      showSnackbar({
        title: t('error', 'Error'),
        kind: 'error',
        isLowContrast: false,
        subtitle: encounterTypesErrorMessage,
      });
    }
  }, [encounterTypesErrorMessage, t]);

  const reset = () => {
    setSelectedEncounterTypes([]);
    setEncounterForms([]);
    setEncounterLocations([]);
    setAtLeastCount(0);
    setAtMostCount(0);
    setSelectedEncounterTypes([]);
    setEncounterForms([]);
    setEncounterLocations([]);
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
    try {
      await onSubmit(getQueryDetails(encounterDetails), getDescription(encounterDetails));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Column>
        <div>
          <MultiSelect
            id="encounters"
            onChange={(data) => setSelectedEncounterTypes(data.selectedItems)}
            items={encounterTypeOptions.items}
            selectedItems={encounterTypeOptions.selectedItems}
            label={t('selectEncounterTypes', 'Select encounter types')}
          />
        </div>
      </Column>
      <MultiSelect
        id="forms"
        data-testid="forms"
        onChange={(data) => setEncounterForms(data.selectedItems)}
        items={formOptions.items}
        selectedItems={formOptions.selectedItems}
        label={t('selectForms', 'Select forms')}
      />

      <MultiSelect
        id="locations"
        onChange={(data) => setEncounterLocations(data.selectedItems)}
        items={locationOptions.items}
        selectedItems={locationOptions.selectedItems}
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
          <SearchDatePicker id="onOrAfter" labelText={t('from', 'From')} value={onOrAfter} onChange={setOnOrAfter} />
        </Column>
        <Column>
          <SearchDatePicker id="onOrBefore" labelText={t('to', 'to')} value={onOrBefore} onChange={setOnOrBefore} />
        </Column>
      </div>
      <SearchButtonSet isLoading={isLoading} onHandleSubmit={submit} onHandleReset={reset} />
    </>
  );
};

export default SearchByEncounters;
