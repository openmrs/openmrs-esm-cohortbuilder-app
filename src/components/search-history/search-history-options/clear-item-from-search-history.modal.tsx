import React, { useState } from 'react';
import { Button, InlineLoading, ModalBody, ModalFooter, ModalHeader } from '@carbon/react';
import { useTranslation } from 'react-i18next';
import { getCoreTranslation } from '@openmrs/esm-framework';
import styles from './modals.scss';

interface ClearItemFromSearchHistoryModalProps {
  closeModal: () => void;
  onRemove: () => void;
}

const ClearItemFromSearchHistoryModal: React.FC<ClearItemFromSearchHistoryModalProps> = ({ closeModal, onRemove }) => {
  const { t } = useTranslation();
  const [isRemovingSearchItem, setIsRemovingSearchItem] = useState(false);

  const handleRemove = () => {
    setIsRemovingSearchItem(true);
    onRemove();
    setIsRemovingSearchItem(false);
    closeModal();
  };

  return (
    <div>
      <ModalHeader closeModal={closeModal} title={t('clearItemFromHistory', 'Clear item from search history')} />
      <ModalBody>
        <p>{t('removeItemFromSearchHistory', 'Are you sure you want to remove this item from the search history?')}</p>
      </ModalBody>
      <ModalFooter>
        <Button kind="secondary" onClick={closeModal}>
          {getCoreTranslation('cancel')}
        </Button>
        <Button className={styles.deleteButton} kind="danger" onClick={handleRemove} disabled={isRemovingSearchItem}>
          {isRemovingSearchItem ? (
            <InlineLoading description={t('removing', 'Removing') + '...'} />
          ) : (
            <span>{getCoreTranslation('delete')}</span>
          )}
        </Button>
      </ModalFooter>
    </div>
  );
};

export default ClearItemFromSearchHistoryModal;
