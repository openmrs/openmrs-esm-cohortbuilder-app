import React, { useState } from 'react';
import classNames from 'classnames';
import dayjs from 'dayjs';
import { Column, ContentSwitcher, DatePicker, DatePickerInput, NumberInput, Switch } from '@carbon/react';
import { useTranslation } from 'react-i18next';
import { type SearchByProps } from '../../types';
import { getDescription, getQueryDetails } from './search-by-demographics.utils';
import SearchButtonSet from '../search-button-set/search-button-set';
import styles from './search-by-demographics.style.scss';
import '../../cohort-builder.scss';

const SearchByDemographics: React.FC<SearchByProps> = ({ onSubmit }) => {
  const { t } = useTranslation();
  const [livingStatus, setLivingStatus] = useState('alive');
  const [gender, setGender] = useState('all');
  const [birthDayStartDate, setBirthDayStartDate] = useState('');
  const [birthDayEndDate, setBirthDayEndDate] = useState('');
  const [minAge, setMinAge] = useState(0);
  const [maxAge, setMaxAge] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string>('');

  const genders = [
    {
      id: 0,
      label: t('all', 'All'),
      value: 'all',
    },
    {
      id: 1,
      label: t('males', 'Male'),
      value: 'males',
    },
    {
      id: 3,
      label: t('females', 'Female'),
      value: 'females',
    },
  ];

  const livingStatuses = [
    {
      id: 0,
      label: t('alive', 'Alive'),
      value: 'alive',
    },
    {
      id: 1,
      label: t('dead', 'Dead'),
      value: 'dead',
    },
  ];

  const reset = () => {
    setMaxAge(0);
    setMinAge(0);
    setBirthDayEndDate('');
    setBirthDayStartDate('');
    setSubmitError('');
  };

  const submit = async () => {
    setIsLoading(true);
    setSubmitError('');
    
    try {
      const demographics = {
        gender,
        minAge,
        maxAge,
        birthDayStartDate,
        birthDayEndDate,
        livingStatus,
      };
      await onSubmit(getQueryDetails(demographics), getDescription(demographics));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : t('searchError', 'An error occurred while searching');
      setSubmitError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div role="tabpanel">
      <fieldset>
        <legend className={classNames(styles.text, styles.genderTitle)}>{t('gender', 'Gender')}</legend>
        <div className={styles.genderContainer}>
          <div className={styles.switch}>
            <ContentSwitcher
              selectedIndex={genders[0].id}
              className={styles.contentSwitcher}
              size="lg"
              onChange={({ index }) => setGender(genders[index].value)}
              aria-label={t('selectGender', 'Select gender')}
              aria-describedby="gender-help"
            >
              {genders.map((gender) => (
                <Switch 
                  data-testid={gender.label} 
                  key={gender.id} 
                  name={gender.value} 
                  text={gender.label}
                  aria-label={`${t('gender', 'Gender')}: ${gender.label}`}
                />
              ))}
            </ContentSwitcher>
            <div id="gender-help" className="sr-only">
              {t('genderHelp', 'Choose to search for all patients, only males, or only females')}
            </div>
          </div>
          <div className={styles.switch}>
            <ContentSwitcher
              selectedIndex={livingStatuses[0].id}
              className={styles.contentSwitcher}
              size="lg"
              onChange={({ index }) => setLivingStatus(livingStatuses[index].value)}
              aria-label={t('selectLivingStatus', 'Select living status')}
              aria-describedby="living-status-help"
            >
              {livingStatuses.map((livingStatus) => (
                <Switch 
                  key={livingStatus.id} 
                  name={livingStatus.value} 
                  text={livingStatus.label}
                  aria-label={`${t('livingStatus', 'Living status')}: ${livingStatus.label}`}
                />
              ))}
            </ContentSwitcher>
            <div id="living-status-help" className="sr-only">
              {t('livingStatusHelp', 'Choose to search for living patients or deceased patients')}
            </div>
          </div>
        </div>
      </fieldset>
      <fieldset className={styles.column} aria-labelledby="age-range-legend">
        <legend id="age-range-legend" className="sr-only">{t('ageRange', 'Age Range')}</legend>
        <Column className={styles.age}>
          <Column>
            <NumberInput
              data-testid="minAge"
              hideSteppers
              id="minAge"
              invalidText={t('minAgeIsNotValid', 'The age must be greater than 0')}
              label={t('ageBetween', 'Age between')}
              min={0}
              onChange={(event, { value }) => setMinAge(Number(value))}
              value={minAge}
              aria-describedby="age-range-description"
            />
          </Column>
          <Column>
            <NumberInput
              data-testid="maxAge"
              hideSteppers
              id="maxAge"
              invalidText={t('maxAgeIsNotValid', 'The age must be less than 200')}
              label={t('and', 'and')}
              max={200}
              min={0}
              onChange={(event, { value }) => setMaxAge(Number(value))}
              value={maxAge}
              aria-describedby="age-range-description"
            />
          </Column>
        </Column>
        <div id="age-range-description" className="sr-only">
          {t('ageRangeHelp', 'Enter minimum and maximum ages to filter patients by age range. Leave blank to include all ages.')}
        </div>
      </fieldset>
      <fieldset className={styles.column} aria-labelledby="birth-date-legend">
        <legend id="birth-date-legend" className="sr-only">{t('birthDateRange', 'Birth Date Range')}</legend>
        <Column>
          <DatePicker
            datePickerType="single"
            allowInput={false}
            onChange={(date) => setBirthDayStartDate(dayjs(date[0]).format())}
            value={birthDayStartDate && dayjs(birthDayStartDate).format('DD-MM-YYYY')}
          >
            <DatePickerInput
              id="startDate"
              labelText={t('birthDate', 'Birth date between')}
              placeholder="DD-MM-YYYY"
              size="md"
              aria-describedby="birth-date-description"
            />
          </DatePicker>
        </Column>
        <Column>
          <DatePicker
            allowInput={false}
            datePickerType="single"
            onChange={(date) => setBirthDayEndDate(dayjs(date[0]).format())}
            value={birthDayEndDate && dayjs(birthDayEndDate).format('DD-MM-YYYY')}
          >
            <DatePickerInput 
              id="endDate" 
              labelText={t('and', 'and')} 
              placeholder="DD-MM-YYYY" 
              size="md"
              aria-describedby="birth-date-description"
            />
          </DatePicker>
        </Column>
        <div id="birth-date-description" className="sr-only">
          {t('birthDateHelp', 'Select a date range to filter patients by birth date. Leave blank to include all birth dates.')}
        </div>
      </fieldset>
      <SearchButtonSet 
        isLoading={isLoading} 
        onHandleSubmit={submit} 
        onHandleReset={reset} 
        submitError={submitError}
      />
    </div>
  );
};

export default SearchByDemographics;
