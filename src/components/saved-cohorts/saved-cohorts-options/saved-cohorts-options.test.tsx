import React from 'react';
import userEvent from '@testing-library/user-event';
import { render, screen, waitFor } from '@testing-library/react';
import { showModal } from '@openmrs/esm-framework';
import { type DefinitionDataRow } from '../../../types';
import SavedCohortsOptions from './saved-cohorts-options.component';

const mockShowModal = jest.mocked(showModal);

const cohort: DefinitionDataRow = {
  id: '1',
  name: 'Test Cohort',
  description: 'Test Description',
};

describe('Test the saved cohorts options', () => {
  it('should be able to view saved cohorts', async () => {
    const user = userEvent.setup();
    const mockOnViewCohort = jest.fn();
    render(<SavedCohortsOptions cohort={cohort} onViewCohort={mockOnViewCohort} onDeleteCohort={jest.fn()} />);

    await user.click(screen.getByRole('button', { name: /options/i }));
    await waitFor(() => {
      const viewOption = screen.getByText(/view/i);
      expect(viewOption).toBeInTheDocument();
      return viewOption;
    }).then(async (viewOption) => {
      await user.click(viewOption);
    });

    expect(mockOnViewCohort).toBeCalledWith(cohort.id);
  });

  it('should be able to delete a cohort', async () => {
    const user = userEvent.setup();
    const mockOnDeleteCohort = jest.fn();
    render(<SavedCohortsOptions cohort={cohort} onViewCohort={jest.fn()} onDeleteCohort={mockOnDeleteCohort} />);

    await user.click(screen.getByRole('button', { name: /options/i }));
    await waitFor(() => {
      const deleteOption = screen.getByText(/delete/i);
      expect(deleteOption).toBeInTheDocument();
      return deleteOption;
    }).then(async (deleteOption) => {
      await user.click(deleteOption);
    });

    expect(mockShowModal).toHaveBeenCalledWith('delete-cohort-modal', {
      closeModal: expect.any(Function),
      cohortId: cohort.id,
      onDeleteCohort: expect.any(Function),
      size: 'sm',
    });
  });
});
