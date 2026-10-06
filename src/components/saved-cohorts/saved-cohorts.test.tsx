import React from 'react';
import { vi, describe, it, expect, type Mock } from 'vitest';
import { openmrsFetch, showModal } from '@openmrs/esm-framework';
import userEvent from '@testing-library/user-event';
import { render, screen } from '@testing-library/react';
import type { DefinitionDataRow } from '../../types';
import { onDeleteCohort, useCohorts } from './saved-cohorts.resources';
import SavedCohorts from './saved-cohorts.component';

const mockCohorts: DefinitionDataRow[] = [
  {
    id: '1',
    name: 'Female alive',
    description: 'Female Patients that are alive',
  },
  {
    id: '2',
    name: 'Female ages between 10 and 30',
    description: 'Female Patients with ages between 10 and 30 years that are alive',
  },
];

const mockOpenmrsFetch = openmrsFetch as Mock;
const mockUseCohorts = vi.mocked(useCohorts);
const mockOnDeleteCohort = vi.mocked(onDeleteCohort);
const mockShowModal = vi.mocked(showModal);

vi.mock('./saved-cohorts.resources', () => ({
  useCohorts: vi.fn(),
  onDeleteCohort: vi.fn(),
}));

describe('SavedCohorts', () => {
  it('should be able to search for a cohort', async () => {
    mockUseCohorts.mockReturnValue({
      cohorts: mockCohorts,
      isLoading: false,
      isValidating: false,
      error: undefined,
      mutate: vi.fn(),
    });
    mockOpenmrsFetch.mockReturnValue({ data: { results: mockCohorts } });

    render(<SavedCohorts onViewCohort={vi.fn()} />);

    await screen.findByRole('table');
    expect(screen.getByText(mockCohorts[0].name)).toBeInTheDocument();
    expect(screen.getByText(mockCohorts[1].name)).toBeInTheDocument();
  });
  it('should refresh the list after a cohort is deleted', async () => {
    const user = userEvent.setup();
    const mutate = vi.fn();
    mockUseCohorts.mockReturnValue({
      cohorts: mockCohorts,
      isLoading: false,
      isValidating: false,
      error: undefined,
      mutate,
    });
    mockOnDeleteCohort.mockResolvedValue(undefined);

    render(<SavedCohorts onViewCohort={vi.fn()} />);

    await screen.findByRole('table');
    await user.click(screen.getAllByRole('button', { name: /options/i })[0]);
    await user.click(screen.getByText(/delete/i));

    const [, modalProps] = mockShowModal.mock.calls.find(([modalName]) => modalName === 'delete-cohort-modal');
    const { onDeleteCohort: deleteFromModal } = modalProps as { onDeleteCohort: () => Promise<void> };
    await deleteFromModal();

    expect(mockOnDeleteCohort).toHaveBeenCalledWith(mockCohorts[0].id);
    expect(mutate).toHaveBeenCalled();
  });
  it('should keep the remaining cohorts visible after the last row on page two is deleted', async () => {
    const user = userEvent.setup();
    const cohorts: DefinitionDataRow[] = Array.from({ length: 11 }, (_, i) => ({
      id: `cohort-${i + 1}`,
      name: `Cohort ${i + 1}`,
      description: 'description',
    }));
    const result = { cohorts, isLoading: false, isValidating: false, error: undefined, mutate: vi.fn() };
    mockUseCohorts.mockReturnValue(result);

    const view = render(<SavedCohorts onViewCohort={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: /next page/i }));
    expect(screen.getByText('Cohort 11')).toBeInTheDocument();

    mockUseCohorts.mockReturnValue({ ...result, cohorts: cohorts.slice(0, 10) });
    view.rerender(<SavedCohorts onViewCohort={vi.fn()} />);

    expect(screen.getByText('Cohort 1')).toBeInTheDocument();
    expect(screen.getByText('Cohort 10')).toBeInTheDocument();
  });
  it('should only render the loading skeleton while the cohorts are loading', () => {
    mockUseCohorts.mockReturnValue({
      cohorts: [],
      isLoading: true,
      isValidating: true,
      error: undefined,
      mutate: vi.fn(),
    });

    render(<SavedCohorts onViewCohort={vi.fn()} />);

    expect(screen.getAllByRole('columnheader', { name: 'Name' })).toHaveLength(1);
    expect(screen.queryByText(/there are no cohorts to display/i)).not.toBeInTheDocument();
  });
});
