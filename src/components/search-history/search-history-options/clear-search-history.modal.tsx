import React, { useState } from 'react';
import { Button, InlineLoading, ModalBody, ModalFooter, ModalHeader } from '@carbon/react';
import { useTranslation } from 'react-i18next';
import { getCoreTranslation } from '@openmrs/esm-framework';
import styles from './modals.scss';

interface ClearSearchHistoryModalProps {
  closeModal: () => void;
  onClearHistory: () => void;
  searchItemName: string;
}

const ClearSearchHistoryModal: React.FC<ClearSearchHistoryModalProps> = ({
  closeModal,
  onClearHistory,
  searchItemName,
}) => {
  const { t } = useTranslation();
  const [isRemovingSearchItem, setIsRemovingSearchItem] = useState(false);

  const handleClearHistory = () => {
    setIsRemovingSearchItem(true);
    onClearHistory();
    setIsRemovingSearchItem(false);
    closeModal();
  };

  return (
    <div>
      <ModalHeader closeModal={closeModal} title={t('clearSearchHistory', 'Clear search history')} />
      <ModalBody>
        <p>{t('clearSearchHistoryModalText', 'Are you sure you want to clear the search history?')}</p>
      </ModalBody>
      <ModalFooter>
        <Button kind="secondary" onClick={closeModal}>
          {getCoreTranslation('cancel')}
        </Button>
        <Button
          className={styles.deleteButton}
          disabled={isRemovingSearchItem}
          kind="danger"
          onClick={handleClearHistory}
        >
          {isRemovingSearchItem ? (
            <InlineLoading description={t('clearing', 'Clearing') + '...'} />
          ) : (
            <span>{t('clearHistory', 'Clear history')}</span>
          )}
        </Button>
      </ModalFooter>
    </div>
  );
};

export default ClearSearchHistoryModal;
