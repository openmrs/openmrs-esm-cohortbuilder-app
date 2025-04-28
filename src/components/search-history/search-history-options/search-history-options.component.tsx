import React, { useState } from 'react';
import { useTranslation, type TFunction } from 'react-i18next';
import { OverflowMenu, OverflowMenuItem } from '@carbon/react';
import { showModal, showSnackbar } from '@openmrs/esm-framework';
import { downloadCSV } from '../../../cohort-builder.utils';
import type { Cohort, Patient, SearchHistoryItem } from '../../../types';
import { createCohort, createQuery } from './search-history-options.resources';
import styles from './search-history-options.scss';

const Option = {
  DELETE: 'delete',
  DOWNLOAD: 'download',
  SAVE_COHORT: 'saveCohort',
  SAVE_QUERY: 'saveQuery',
} as const;

type OptionType = (typeof Option)[keyof typeof Option];

interface SearchHistoryOptions {
  searchItem: SearchHistoryItem;
  updateSearchHistory: (selectedSearchItem: SearchHistoryItem) => void;
}

const createCohortFromSearchItem = async (
  name: string,
  description: string,
  searchItem: SearchHistoryItem,
  t: TFunction,
) => {
  const cohortMembers: number[] = [];
  const { patients } = searchItem;
  patients.forEach((patient: Patient) => cohortMembers.push(parseInt(patient.id)));

  const cohort: Cohort = {
    display: name,
    memberIds: cohortMembers,
    description: description,
    name: name,
  };

  try {
    await createCohort(cohort);
    showSnackbar({
      title: t('success', 'Success'),
      kind: 'success',
      isLowContrast: true,
      subtitle: t('cohortSaved', 'Cohort created successfully'),
    });
  } catch (error) {
    showSnackbar({
      title: t('errorCreatingCohort', 'Error creating the cohort'),
      kind: 'error',
      isLowContrast: true,
      subtitle: error?.message,
    });
  }
};

const SearchHistoryOptions: React.FC<SearchHistoryOptions> = ({ searchItem, updateSearchHistory }) => {
  const { t } = useTranslation();
  const [cohortName, setCohortName] = useState('');
  const [cohortDescription, setCohortDescription] = useState('');
  const [queryName, setQueryName] = useState('');
  const [queryDescription, setQueryDescription] = useState('');

  const handleOption = async (option: OptionType) => {
    const { patients, description } = searchItem;
    switch (option) {
      case Option.SAVE_COHORT:
        setCohortDescription(description);
        launchSaveCohortModal();
        break;
      case Option.SAVE_QUERY:
        setQueryDescription(description);
        launchSaveQueryModal();
        break;
      case Option.DOWNLOAD:
        downloadCSV(patients, description);
        break;
      case Option.DELETE:
        launchClearSearchHistoryModal();
        break;
    }
  };

  const handleDeleteSearchItem = async () => {
    try {
      updateSearchHistory(searchItem);
      showSnackbar({
        title: t('success', 'Success'),
        kind: 'success',
        isLowContrast: true,
        subtitle: 'the search item is deleted',
      });
    } catch (error) {
      showSnackbar({
        title: t('searchItemDeleteError', 'Error deleting the cohort'),
        kind: 'error',
        isLowContrast: true,
        subtitle: error?.message,
      });
    }
  };

  const handleSaveQuery = async () => {
    try {
      const { parameters } = searchItem;
      parameters.name = queryName;
      parameters.description = queryDescription;
      await createQuery(parameters);
      setQueryName('');
      setQueryDescription('');
      showSnackbar({
        title: t('success', 'Success'),
        kind: 'success',
        isLowContrast: true,
        subtitle: 'the query is saved',
      });
    } catch (error) {
      showSnackbar({
        title: t('queryDeleteError', 'Error saving the query'),
        kind: 'error',
        isLowContrast: true,
        subtitle: error?.message,
      });
    }
  };

  const launchSaveQueryModal = () => {
    const dispose = showModal('save-query-modal', {
      closeModal: () => dispose(),
      onSaveQuery: handleSaveQuery,
      size: 'sm',
    });
  };

  const launchClearSearchHistoryModal = () => {
    const dispose = showModal('clear-search-history-modal', {
      closeModal: () => dispose(),
      onClear: handleDeleteSearchItem,
      searchItemName: searchItem?.description,
      size: 'sm',
    });
  };

  const launchSaveCohortModal = () => {
    const dispose = showModal('save-cohort-modal', {
      closeModal: () => dispose(),
      onSave: (name: string, description: string) => createCohortFromSearchItem(name, description, searchItem, t),
      size: 'sm',
    });
  };

  return (
    <OverflowMenu
      aria-label={t('searchHistoryOptions', 'Search history options')}
      size="md"
      flipped
      direction="top"
      data-testid="options"
    >
      <OverflowMenuItem
        className={styles.menuItem}
        data-testid="save-cohort"
        itemText={t('saveCohort', 'Save cohort')}
        onClick={() => handleOption(Option.SAVE_COHORT)}
      />
      <OverflowMenuItem
        className={styles.menuItem}
        data-testid="save-query"
        itemText={t('saveQuery', 'Save query')}
        onClick={() => handleOption(Option.SAVE_QUERY)}
      />
      <OverflowMenuItem
        className={styles.menuItem}
        itemText={t('downloadResults', 'Download results')}
        onClick={() => handleOption(Option.DOWNLOAD)}
      />
      <OverflowMenuItem
        className={styles.menuItem}
        data-testid="deleteFromHistory"
        hasDivider
        isDelete
        itemText={t('deleteFromHistory', 'Delete from history')}
        onClick={() => handleOption(Option.DELETE)}
      />
    </OverflowMenu>
  );
};

export default SearchHistoryOptions;
