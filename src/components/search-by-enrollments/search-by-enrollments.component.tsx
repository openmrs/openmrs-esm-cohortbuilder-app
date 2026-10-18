import React, { useEffect, useState } from 'react';
import { Column, MultiSelect } from '@carbon/react';
import { showSnackbar } from '@openmrs/esm-framework';
import { useTranslation } from 'react-i18next';
import { useLocations } from '../../cohort-builder.resources';
import { type DropdownValue, type SearchByProps } from '../../types';
import { usePrograms } from './search-by-enrollments.resources';
import { getQueryDetails, getDescription } from './search-by-enrollments.utils';
import SearchButtonSet from '../search-button-set/search-button-set';
import SearchDatePicker from '../search-date-picker/search-date-picker';
import styles from './search-by-enrollments.style.scss';

const SearchByEnrollments: React.FC<SearchByProps> = ({ onSubmit }) => {
  const { t } = useTranslation();
  const { programs, programsError } = usePrograms();
  const { locations, locationsError } = useLocations();
  const [enrolledOnOrAfter, setEnrolledOnOrAfter] = useState('');
  const [enrolledOnOrBefore, setEnrolledOnOrBefore] = useState('');
  const [completedOnOrAfter, setCompletedOnOrAfter] = useState('');
  const [completedOnOrBefore, setCompletedOnOrBefore] = useState('');
  const [selectedLocations, setSelectedLocations] = useState<DropdownValue[]>([]);
  const [selectedPrograms, setSelectedPrograms] = useState<DropdownValue[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const programsErrorMessage = programsError?.message;

  useEffect(() => {
    if (programsErrorMessage) {
      showSnackbar({
        title: t('error', 'Error'),
        kind: 'error',
        isLowContrast: false,
        subtitle: programsErrorMessage,
      });
    }
  }, [programsErrorMessage, t]);

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

  const handleResetInputs = () => {
    setSelectedPrograms([]);
    setSelectedLocations([]);
    setEnrolledOnOrAfter('');
    setEnrolledOnOrBefore('');
    setCompletedOnOrAfter('');
    setCompletedOnOrBefore('');
  };

  const submit = async () => {
    setIsLoading(true);
    const searchParams = {
      enrolledOnOrAfter,
      enrolledOnOrBefore,
      completedOnOrAfter,
      completedOnOrBefore,
      selectedPrograms,
      selectedLocations,
    };
    try {
      await onSubmit(getQueryDetails(searchParams), getDescription(searchParams));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Column>
        <div>
          <MultiSelect
            id="programs"
            data-testid="programs"
            onChange={(data) => setSelectedPrograms(data.selectedItems)}
            selectedItems={selectedPrograms}
            items={programs}
            label={t('selectPrograms', 'Select programs')}
          />
        </div>
      </Column>
      <Column>
        <div>
          <MultiSelect
            id="locations"
            data-testid="locations"
            onChange={(data) => setSelectedLocations(data.selectedItems)}
            selectedItems={selectedLocations}
            items={locations}
            label={t('selectLocations', 'Select locations')}
          />
        </div>
      </Column>
      <div className={styles.column}>
        <Column>
          <SearchDatePicker
            id="enrolledOnOrAfter"
            labelText={t('enrolledBetween', 'Enrolled between')}
            value={enrolledOnOrAfter}
            onChange={setEnrolledOnOrAfter}
          />
        </Column>
        <Column>
          <SearchDatePicker
            id="enrolledOnOrBefore"
            labelText={t('and', 'and')}
            value={enrolledOnOrBefore}
            onChange={setEnrolledOnOrBefore}
          />
        </Column>
      </div>
      <div className={styles.column}>
        <Column>
          <SearchDatePicker
            id="completedOnOrAfter"
            labelText={t('completedBetween', 'Completed between')}
            value={completedOnOrAfter}
            onChange={setCompletedOnOrAfter}
          />
        </Column>
        <Column>
          <SearchDatePicker
            id="completedOnOrBefore"
            labelText={t('and', 'and')}
            value={completedOnOrBefore}
            onChange={setCompletedOnOrBefore}
          />
        </Column>
      </div>
      <SearchButtonSet onHandleReset={handleResetInputs} onHandleSubmit={submit} isLoading={isLoading} />
    </>
  );
};

export default SearchByEnrollments;
