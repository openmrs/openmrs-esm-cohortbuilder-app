import React from 'react';
import { OverflowMenu, OverflowMenuItem } from '@carbon/react';
import { useTranslation } from 'react-i18next';
import { showModal, showSnackbar } from '@openmrs/esm-framework';
import type { DefinitionDataRow } from '../../../types';
import styles from './saved-cohort-options.scss';

const Options = {
  VIEW: 'view',
  DELETE: 'delete',
} as const;

interface SavedCohortsOptionsProps {
  cohort: DefinitionDataRow;
  onViewCohort: (cohortId: string) => Promise<void>;
  onDeleteCohort: (cohortId: string) => Promise<void>;
}

const SavedCohortsOptions: React.FC<SavedCohortsOptionsProps> = ({ cohort, onViewCohort, onDeleteCohort }) => {
  const { t } = useTranslation();

  const handleViewCohort = async () => {
    try {
      await onViewCohort(cohort.id);
    } catch (error) {
      showSnackbar({
        title: t('cohortViewError', 'Error viewing the cohort'),
        kind: 'error',
        isLowContrast: true,
        subtitle: error?.message,
      });
    }
  };

  const handleMenuItemClick = async (option: (typeof Options)[keyof typeof Options]) => {
    switch (option) {
      case Options.VIEW:
        handleViewCohort();
        break;
      case Options.DELETE:
        launchDeleteCohortModal(cohort.id);
        break;
    }
  };

  const launchDeleteCohortModal = (cohortId: string) => {
    const dispose = showModal('delete-cohort-modal', {
      closeModal: () => dispose(),
      cohortId,
      onDeleteCohort: handleDeleteCohort,
      size: 'sm',
    });
  };

  const handleDeleteCohort = async () => {
    await onDeleteCohort(cohort.id);
  };

  return (
    <OverflowMenu
      aria-label={t('savedCohortsOptions', 'Saved cohorts options')}
      flipped
      direction="bottom"
      data-testid="options"
    >
      <OverflowMenuItem
        className={styles.menuItem}
        data-testid="view"
        itemText={t('view', 'View')}
        onClick={() => handleMenuItemClick(Options.VIEW)}
      />
      <OverflowMenuItem
        className={styles.menuItem}
        data-testid="delete"
        hasDivider
        isDelete
        itemText={t('delete', 'Delete')}
        onClick={() => handleMenuItemClick(Options.DELETE)}
      />
    </OverflowMenu>
  );
};

export default SavedCohortsOptions;
