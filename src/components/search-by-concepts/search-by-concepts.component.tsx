import React, { useState } from 'react';
import { DatePicker, DatePickerInput, Column, Dropdown, NumberInput, Switch, ContentSwitcher } from '@carbon/react';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';
import { composeJson, queryDescriptionBuilder } from '../../cohort-builder.utils';
import type { Concept, SearchByProps } from '../../types';
import { SearchConcept } from './search-concept/search-concept.component';
import SearchButtonSet from '../search-button-set/search-button-set';
import styles from './search-by-concepts.style.scss';
import '../../cohort-builder.scss';

const operators = [
  {
    id: 0,
    label: '<',
    value: 'LESS_THAN',
  },
  {
    id: 1,
    label: '<=',
    value: 'LESS_EQUAL',
  },
  {
    id: 2,
    label: '=',
    value: 'EQUAL',
  },
  {
    id: 3,
    label: '>=',
    value: 'GREATER_EQUAL',
  },
  {
    id: 4,
    label: '>',
    value: 'GREATER_THAN',
  },
];

interface Observation {
  timeModifier: string;
  question: string;
  operator1: string;
  modifier: string;
  onOrBefore: string;
  onOrAfter: string;
  value1: string;
}

const types = {
  CWE: 'codedObsSearchAdvanced',
  NM: 'numericObsSearchAdvanced',
  DT: 'dateObsSearchAdvanced',
  ST: 'dateObsSearchAdvanced',
  TS: 'textObsSearchAdvanced',
  ZZ: 'codedObsSearchAdvanced',
  BIT: 'codedObsSearchAdvanced',
};

const SearchByConcepts: React.FC<SearchByProps> = ({ onSubmit }) => {
  const { t } = useTranslation();
  const [concept, setConcept] = useState<Concept | null>(null);
  const [lastDays, setLastDays] = useState(0);
  const [lastMonths, setLastMonths] = useState(0);
  const [operatorValue, setOperatorValue] = useState(0);
  const [operator, setOperator] = useState('LESS_THAN');
  const [timeModifier, setTimeModifier] = useState('ANY');
  const [onOrAfter, setOnOrAfter] = useState('');
  const [onOrBefore, setOnOrBefore] = useState('');
  const [searchText, setSearchText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string>('');

  const observationOptions = [
    {
      id: 'option-0',
      label: t('haveObservations', 'Patients who have these observations'),
      value: 'ANY',
    },
    {
      id: 'option-1',
      label: t('haveNoObservations', 'Patients who do not have these observations'),
      value: 'NO',
    },
  ];

  const whichObservation = [
    {
      id: 'option-0',
      label: t('any', 'Any'),
      value: 'ANY',
    },
    {
      id: 'option-1',
      label: t('none', 'None'),
      value: 'NO',
    },
    {
      id: 'option-2',
      label: t('earliest', 'Earliest'),
      value: 'FIRST',
    },
    {
      id: 'option-3',
      label: t('recent', 'Most Recent'),
      value: 'LAST',
    },
    {
      id: 'option-4',
      label: t('lowest', 'Lowest'),
      value: 'MIN',
    },
    {
      id: 'option-5',
      label: t('highest', 'Highest'),
      value: 'MAX',
    },
    {
      id: 'option-6',
      label: t('average', 'Average'),
      value: 'AVG',
    },
  ];

  const handleReset = () => {
    setConcept(null);
    setLastDays(0);
    setSearchText('');
    setOnOrAfter('');
    setOnOrBefore('');
    setLastMonths(0);
    setOperatorValue(0);
    setOperator('LESS_THAN');
    setTimeModifier('ANY');
    setSubmitError('');
  };

  const getOnOrBefore = () => {
    if (lastDays > 0 || lastMonths > 0) {
      return dayjs().subtract(lastDays, 'days').subtract(lastMonths, 'months').format();
    }
  };

  const handleSubmit = async () => {
    if (!concept) {
      setSubmitError(t('conceptRequired', 'Please select a concept before searching'));
      return;
    }
    
    setIsLoading(true);
    setSubmitError('');
    
    try {
      const observations: Observation = {
        modifier: '',
        operator1: operator,
        value1: operatorValue > 0 ? operatorValue.toString() : '',
        question: concept.uuid,
        onOrBefore: getOnOrBefore() || onOrBefore,
        onOrAfter,
        timeModifier,
      };
      const dataType = types[concept.hl7Abbrev];
      const params = { [dataType]: [] };
      Object.keys(observations).forEach((key) => {
        observations[key] !== ''
          ? params[dataType].push({
              name: key === 'modifier' ? (['CWE', 'TS'].includes(concept.hl7Abbrev) ? 'values' : 'value1') : key,
              value:
                key === 'modifier' && ['CWE', 'TS'].includes(concept.hl7Abbrev) ? [observations[key]] : observations[key],
            })
          : '';
      });
      await onSubmit(composeJson(params), queryDescriptionBuilder(observations, concept.name));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : t('searchError', 'An error occurred while searching');
      setSubmitError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div role="tabpanel">
      <div>
        <SearchConcept
          setConcept={setConcept}
          concept={concept}
          searchText={searchText}
          setSearchText={setSearchText}
        />
        {concept?.hl7Abbrev === 'NM' ? (
          <>
            <fieldset className={styles.column}>
              <legend className="sr-only">{t('observationSelection', 'Observation Selection')}</legend>
              <div style={{ display: 'flex' }}>
                <div className={styles.multipleInputs}>
                  <label htmlFor="timeModifier" className={styles.value} id="observation-label">
                    {t('whatObservations', 'What observations')}
                  </label>
                  <Dropdown
                    id="timeModifier"
                    onChange={(data) => setTimeModifier(data.selectedItem.value)}
                    initialSelectedItem={whichObservation[0]}
                    items={whichObservation}
                    className={styles.timeModifier}
                    label=""
                    titleText=""
                    aria-labelledby="observation-label"
                    aria-describedby="observation-help"
                  />
                  <div id="observation-help" className="sr-only">
                    {t('observationHelp', 'Select which type of observations to include in your search')}
                  </div>
                </div>
              </div>
            </fieldset>
            <fieldset className={styles.column}>
              <legend className={styles.value}>{t('whatValues', 'What values')}</legend>
              <div className={styles.whatValuesInputs} role="group" aria-labelledby="values-legend" aria-describedby="values-help">
                <div id="values-legend" className="sr-only">{t('valueSelection', 'Value selection')}</div>
                <div id="values-help" className="sr-only">
                  {t('valuesHelp', 'Select a comparison operator and enter a numeric value to filter observations')}
                </div>
                <div className={styles.operators}>
                  <ContentSwitcher
                    selectedIndex={operators[0].id}
                    className={styles.contentSwitcher}
                    size="lg"
                    onChange={({ index }) => setOperator(operators[index].value)}
                    aria-label={t('selectOperator', 'Select comparison operator')}
                    aria-describedby="operator-help"
                  >
                    {operators.map((operator) => (
                      <Switch 
                        key={operator.id} 
                        name={operator.value} 
                        text={operator.label}
                        aria-label={`${t('operator', 'Operator')}: ${operator.label}`}
                      />
                    ))}
                  </ContentSwitcher>
                  <div id="operator-help" className="sr-only">
                    {t('operatorHelp', 'Choose how to compare the observation values: less than, equal to, greater than, etc.')}
                  </div>
                </div>
                <div className={styles.multipleInputs}>
                  <NumberInput
                    hideSteppers
                    id="operator-value"
                    invalidText={t('numberIsNotValid', 'Number is not valid')}
                    label={t('valueIn', 'Enter a value in ') + concept.units}
                    min={0}
                    size="sm"
                    value={operatorValue}
                    onChange={(event, { value }) => setOperatorValue(Number(value))}
                    aria-describedby="value-help"
                  />
                  <div id="value-help" className="sr-only">
                    {t('valueInputHelp', `Enter the numeric value to compare against. Unit: ${concept.units || 'none'}`)}
                  </div>
                </div>
              </div>
            </fieldset>
          </>
        ) : (
          <fieldset className={styles.column} role="group" aria-labelledby="observation-filter-legend">
            <legend id="observation-filter-legend" className="sr-only">{t('observationFilter', 'Observation Filter Options')}</legend>
            <Dropdown
              id="timeModifier"
              data-testid="timeModifier"
              onChange={(data) => setTimeModifier(data.selectedItem.value)}
              initialSelectedItem={observationOptions[0]}
              items={observationOptions}
              label=""
              titleText=""
              aria-label={t('selectObservationType', 'Select observation type')}
              aria-describedby="observation-type-help"
            />
            <div id="observation-type-help" className="sr-only">
              {t('observationTypeHelp', 'Choose whether to search for patients who have or do not have these observations')}
            </div>
          </fieldset>
        )}
        <fieldset className={styles.dateRange} aria-labelledby="time-range-legend">
          <legend id="time-range-legend" className="sr-only">{t('timeRangeSelection', 'Time Range Selection')}</legend>
          <Column>
            <NumberInput
              hideSteppers
              id="last-months"
              data-testid="last-months"
              label={t('withinTheLast', 'Within the last months')}
              invalidText={t('numberIsNotValid', 'Number is not valid')}
              min={0}
              value={lastMonths}
              onChange={(event, { value }) => setLastMonths(Number(value))}
              aria-describedby="months-help"
            />
            <div id="months-help" className="sr-only">
              {t('monthsHelp', 'Enter number of months to look back from today')}
            </div>
          </Column>
          <Column>
            <NumberInput
              hideSteppers
              label={t('lastDays', 'and / or days')}
              id="last-days"
              data-testid="last-days"
              invalidText={t('numberIsNotValid', 'Number is not valid')}
              min={0}
              value={lastDays}
              onChange={(event, { value }) => setLastDays(Number(value))}
              aria-describedby="days-help"
            />
            <div id="days-help" className="sr-only">
              {t('daysHelp', 'Enter additional days to look back, combined with months above')}
            </div>
          </Column>
        </fieldset>
        <fieldset className={styles.dateRange} role="group" aria-labelledby="specific-date-legend">
          <legend id="specific-date-legend" className="sr-only">{t('specificDateRange', 'Specific Date Range Selection')}</legend>
          <div className={styles.dateRange}>
            <Column>
              <DatePicker
                datePickerType="single"
                allowInput={false}
                onChange={(date) => setOnOrAfter(dayjs(date[0]).format())}
                value={onOrAfter && dayjs(onOrAfter).format('DD-MM-YYYY')}
              >
                <DatePickerInput
                  id="startDate"
                  labelText={t('dateRange', 'Date range start date')}
                  placeholder="DD-MM-YYYY"
                  size="md"
                  aria-describedby="start-date-help"
                />
              </DatePicker>
              <div id="start-date-help" className="sr-only">
                {t('startDateHelp', 'Select the earliest date to include observations from')}
              </div>
            </Column>
            <Column>
              <DatePicker
                datePickerType="single"
                allowInput={false}
                onChange={(date) => setOnOrBefore(dayjs(date[0]).format())}
                value={onOrBefore && dayjs(onOrBefore).format('DD-MM-YYYY')}
              >
                <DatePickerInput 
                  id="endDate" 
                  labelText={t('endDate', 'End date')} 
                  placeholder="DD-MM-YYYY" 
                  size="md"
                  aria-describedby="end-date-help" 
                />
              </DatePicker>
              <div id="end-date-help" className="sr-only">
                {t('endDateHelp', 'Select the latest date to include observations from')}
              </div>
            </Column>
          </div>
        </fieldset>
      </div>
      <SearchButtonSet 
        isLoading={isLoading} 
        onHandleSubmit={handleSubmit} 
        onHandleReset={handleReset} 
        submitError={submitError}
      />
    </div>
  );
};

export default SearchByConcepts;
