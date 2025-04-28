import React from 'react';
import { useTranslation } from 'react-i18next';
import { OverflowMenu, OverflowMenuItem } from '@carbon/react';
import { showModal, showSnackbar } from '@openmrs/esm-framework';
import { type DefinitionDataRow } from '../../../types';
import styles from './saved-queries-options.scss';

const Options = {
  DELETE: 'delete',
  VIEW: 'view',
} as const;

type OptionType = (typeof Options)[keyof typeof Options];

interface SavedQueriesOptionsProps {
  query: DefinitionDataRow;
  onViewQuery: (queryId: string) => Promise<void>;
  deleteQuery: (queryId: string) => Promise<void>;
}

const SavedQueriesOptions: React.FC<SavedQueriesOptionsProps> = ({ query, onViewQuery, deleteQuery }) => {
  const { t } = useTranslation();

  const handleOption = async (option: OptionType) => {
    switch (option) {
      case Options.VIEW:
        handleViewQuery();
        break;
      case Options.DELETE:
        launchDeleteQueryModal();
        break;
    }
  };

  const handleViewQuery = async () => {
    try {
      await onViewQuery(query.id);
    } catch (error) {
      showSnackbar({
        title: t('QueryDeleteError', 'Something went wrong'),
        kind: 'error',
        isLowContrast: true,
        subtitle: error?.message,
      });
    }
  };

  const launchDeleteQueryModal = () => {
    const dispose = showModal('delete-query-modal', {
      closeModal: () => dispose(),
      queryName: query.name,
      queryId: query.id,
      onDelete: handleDeleteQuery,
      size: 'sm',
    });
  };

  const handleDeleteQuery = async () => {
    await deleteQuery(query.id);
  };

  return (
    <OverflowMenu aria-label={t('savedQueriesOptions', 'Saved queries options')} size="md" flipped direction="bottom">
      <OverflowMenuItem
        className={styles.menuItem}
        data-testid="view"
        itemText={t('view', 'View')}
        onClick={() => handleOption(Options.VIEW)}
      />
      <OverflowMenuItem
        className={styles.menuItem}
        data-testid="delete"
        hasDivider
        isDelete
        itemText={t('delete', 'Delete')}
        onClick={() => handleOption(Options.DELETE)}
      />
    </OverflowMenu>
  );
};

export default SavedQueriesOptions;
