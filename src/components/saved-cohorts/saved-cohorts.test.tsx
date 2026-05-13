import React from 'react';
import { vi, describe, it, expect, type Mock } from 'vitest';
import { openmrsFetch } from '@openmrs/esm-framework';
import { render, screen } from '@testing-library/react';
import type { DefinitionDataRow } from '../../types';
import { useCohorts } from './saved-cohorts.resources';
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
    });
    mockOpenmrsFetch.mockReturnValue({ data: { results: mockCohorts } });

    render(<SavedCohorts onViewCohort={vi.fn()} />);

    await screen.findByRole('table');
    expect(screen.getByText(mockCohorts[0].name)).toBeInTheDocument();
    expect(screen.getByText(mockCohorts[1].name)).toBeInTheDocument();
  });
});
