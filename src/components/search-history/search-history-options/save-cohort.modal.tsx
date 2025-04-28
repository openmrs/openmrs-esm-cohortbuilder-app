import React from 'react';
import { useTranslation, type TFunction } from 'react-i18next';
import { Button, ModalBody, ModalFooter, ModalHeader, TextInput, Stack } from '@carbon/react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { getCoreTranslation } from '@openmrs/esm-framework';
import styles from './modals.scss';

const createCohortSchema = (t: TFunction) =>
  z.object({
    name: z
      .string({
        required_error: t('cohortNameRequired', 'Cohort name is required'),
      })
      .trim()
      .min(1, t('cohortNameRequired', 'Cohort name is required')),
    description: z
      .string({
        required_error: t('cohortDescriptionRequired', 'Description is required'),
      })
      .trim()
      .min(1, t('cohortDescriptionRequired', 'Description is required')),
  });

type CohortFormData = z.infer<ReturnType<typeof createCohortSchema>>;

interface SaveCohortModalProps {
  closeModal: () => void;
  onSave: (name: string, description: string) => void;
}

const SaveCohortModal: React.FC<SaveCohortModalProps> = ({ closeModal, onSave }) => {
  const { t } = useTranslation();
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<CohortFormData>({
    resolver: zodResolver(createCohortSchema(t)),
    mode: 'onChange',
  });

  const onSubmit = (data: CohortFormData) => {
    onSave(data.name.trim(), data.description.trim());
    closeModal();
  };

  return (
    <div>
      <ModalHeader closeModal={closeModal} title={t('saveCohort', 'Save cohort')} />
      <ModalBody>
        <form onSubmit={handleSubmit(onSubmit)}>
          <Stack gap={5}>
            <Controller
              name="name"
              control={control}
              render={({ field }) => (
                <TextInput
                  data-testid="cohort-name"
                  id="cohort-name"
                  labelText={t('enterCohortName', 'Enter a cohort name')}
                  {...field}
                  invalid={!!errors.name}
                  invalidText={errors.name?.message}
                />
              )}
            />
            <Controller
              name="description"
              control={control}
              render={({ field }) => (
                <TextInput
                  data-testid="cohort-description"
                  id="cohort-description"
                  labelText={t('enterCohortDescription', 'Enter a cohort description')}
                  {...field}
                  invalid={!!errors.description}
                  invalidText={errors.description?.message}
                />
              )}
            />
          </Stack>
        </form>
      </ModalBody>
      <ModalFooter>
        <Button kind="secondary" onClick={closeModal}>
          {getCoreTranslation('cancel')}
        </Button>
        <Button className={styles.deleteButton} kind="danger" onClick={handleSubmit(onSubmit)}>
          <span>{getCoreTranslation('save')}</span>
        </Button>
      </ModalFooter>
    </div>
  );
};

export default SaveCohortModal;
