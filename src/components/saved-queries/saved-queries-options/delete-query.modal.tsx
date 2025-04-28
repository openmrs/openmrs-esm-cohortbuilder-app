import React, { useState } from 'react';
import { Button, InlineLoading, ModalBody, ModalHeader, ModalFooter } from '@carbon/react';
import { useTranslation } from 'react-i18next';
import { getCoreTranslation } from '@openmrs/esm-framework';

interface DeleteQueryModalProps {
  closeModal: () => void;
  onDelete: (queryId: string) => Promise<void>;
  queryName: string;
  queryId: string;
}

const DeleteQueryModal: React.FC<DeleteQueryModalProps> = ({ closeModal, queryName, queryId, onDelete }) => {
  const { t } = useTranslation();
  const [isDeletingQuery, setIsDeletingQuery] = useState(false);

  const handleDeleteQuery = async () => {
    setIsDeletingQuery(true);
    await onDelete(queryId);
    setIsDeletingQuery(false);
  };

  return (
    <div>
      <ModalHeader closeModal={closeModal} title={t('deleteSavedQuery', 'Delete saved query')} />
      <ModalBody>
        <p>{t('deleteSavedQueryConfirmation', 'Are you sure you want to delete this saved query?')}</p>
      </ModalBody>
      <ModalFooter>
        <Button kind="secondary" onClick={closeModal}>
          {getCoreTranslation('cancel')}
        </Button>
        <Button kind="danger" onClick={handleDeleteQuery} disabled={isDeletingQuery}>
          {isDeletingQuery ? (
            <InlineLoading description={t('deleting', 'Deleting') + '...'} />
          ) : (
            <span>{getCoreTranslation('delete')}</span>
          )}
        </Button>
      </ModalFooter>
    </div>
  );
};

export default DeleteQueryModal;
