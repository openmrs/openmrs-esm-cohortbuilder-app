import React from 'react';
import { useTranslation, type TFunction } from 'react-i18next';
import { Button, InlineLoading, ModalBody, ModalFooter, ModalHeader, Stack, TextInput } from '@carbon/react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { getCoreTranslation } from '@openmrs/esm-framework';
import styles from './modals.scss';

const createSaveQuerySchema = (t: TFunction) =>
  z.object({
    queryName: z
      .string({ required_error: t('queryNameRequired', 'Name is required') })
      .min(1, t('queryNameRequired', 'Name is required')),
    queryDescription: z
      .string({ required_error: t('queryDescriptionRequired', 'Description is required') })
      .min(1, t('queryDescriptionRequired', 'Description is required')),
  });

type SaveQueryFormData = z.infer<ReturnType<typeof createSaveQuerySchema>>;

interface SaveQueryModalProps {
  closeModal: () => void;
  onSaveQuery: (data: SaveQueryFormData) => void;
}

const SaveQueryModal: React.FC<SaveQueryModalProps> = ({ closeModal, onSaveQuery }) => {
  const { t } = useTranslation();

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SaveQueryFormData>({
    resolver: zodResolver(createSaveQuerySchema(t)),
    defaultValues: {
      queryName: '',
      queryDescription: '',
    },
  });

  const onSubmit = async (data: SaveQueryFormData) => {
    await onSaveQuery(data);
    closeModal();
  };

  return (
    <div>
      <ModalHeader closeModal={closeModal} title={t('saveQuery', 'Save query')} />
      <form onSubmit={handleSubmit(onSubmit)}>
        <ModalBody>
          <Stack gap={5}>
            <Controller
              name="queryName"
              control={control}
              render={({ field }) => (
                <TextInput
                  {...field}
                  labelText={t('enterQueryName', 'Enter a name for the query')}
                  id="query-name"
                  data-testid="query-name"
                  invalid={!!errors.queryName}
                  invalidText={errors.queryName?.message}
                />
              )}
            />
            <Controller
              name="queryDescription"
              control={control}
              render={({ field }) => (
                <TextInput
                  {...field}
                  labelText={t('enterQueryDescription', 'Enter a description of the query')}
                  id="query-description"
                  invalid={!!errors.queryDescription}
                  invalidText={errors.queryDescription?.message}
                />
              )}
            />
          </Stack>
        </ModalBody>
        <ModalFooter>
          <Button kind="secondary" onClick={closeModal}>
            {getCoreTranslation('cancel')}
          </Button>
          <Button className={styles.deleteButton} disabled={isSubmitting} kind="primary" type="submit">
            {isSubmitting ? (
              <InlineLoading description={t('saving', 'Saving') + '...'} />
            ) : (
              <span>{getCoreTranslation('save')}</span>
            )}
          </Button>
        </ModalFooter>
      </form>
    </div>
  );
};

export default SaveQueryModal;
