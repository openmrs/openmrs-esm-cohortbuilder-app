import React, { useEffect, useState } from 'react';
import { Column, MultiSelect } from '@carbon/react';
import { showSnackbar } from '@openmrs/esm-framework';
import { useTranslation } from 'react-i18next';
import { useLocations } from '../../cohort-builder.resources';
import { withSelectedItems } from '../../cohort-builder.utils';
import { type DropdownValue, type SearchByProps } from '../../types';
import { usePrograms } from './search-by-enrollments.resources';
import { type EnrollmentsSearchParams, getQueryDetails, getDescription } from './search-by-enrollments.utils';
import SearchButtonSet from '../search-button-set/search-button-set';
import SearchDatePicker from '../search-date-picker/search-date-picker';
import styles from './search-by-enrollments.style.scss';

interface SearchByEnrollmentsProps extends SearchByProps {
  /** The values to start with, such as a definition link's. */
  initialValues?: EnrollmentsSearchParams;
}

const SearchByEnrollments: React.FC<SearchByEnrollmentsProps> = ({ onSubmit, initialValues }) => {
  const { t } = useTranslation();
  const { programs, programsError } = usePrograms();
  const { locations, locationsError } = useLocations();
  const [enrolledOnOrAfter, setEnrolledOnOrAfter] = useState(initialValues?.enrolledOnOrAfter ?? '');
  const [enrolledOnOrBefore, setEnrolledOnOrBefore] = useState(initialValues?.enrolledOnOrBefore ?? '');
  const [completedOnOrAfter, setCompletedOnOrAfter] = useState(initialValues?.completedOnOrAfter ?? '');
  const [completedOnOrBefore, setCompletedOnOrBefore] = useState(initialValues?.completedOnOrBefore ?? '');
  const [selectedLocations, setSelectedLocations] = useState<DropdownValue[]>(initialValues?.selectedLocations ?? []);
  const [selectedPrograms, setSelectedPrograms] = useState<DropdownValue[]>(initialValues?.selectedPrograms ?? []);
  const programOptions = withSelectedItems(programs, selectedPrograms);
  const locationOptions = withSelectedItems(locations, selectedLocations);
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
            items={programOptions.items}
            selectedItems={programOptions.selectedItems}
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
            items={locationOptions.items}
            selectedItems={locationOptions.selectedItems}
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
