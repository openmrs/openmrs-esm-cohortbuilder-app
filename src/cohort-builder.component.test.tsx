import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { openmrsFetch } from '@openmrs/esm-framework';
import type { SearchByProps } from './types';
import CohortBuilder from './cohort-builder.component';

// A stand-in for the first tab that searches with whatever it is given.
vi.mock('./components/search-by-concepts/search-by-concepts.component', () => ({
  default: ({ onSubmit }: SearchByProps) => (
    <button onClick={() => onSubmit({ query: {} } as never, 'Any')}>Run</button>
  ),
}));
vi.mock('./components/search-by-demographics/search-by-demographics.component', () => ({ default: () => null }));
vi.mock('./components/search-by-person-attributes/search-by-person-attributes.component', () => ({
  default: () => null,
}));
vi.mock('./components/search-by-encounters/search-by-encounters.component', () => ({ default: () => null }));
vi.mock('./components/search-by-location/search-by-location.component', () => ({ default: () => null }));
vi.mock('./components/search-by-enrollments/search-by-enrollments.component', () => ({ default: () => null }));
vi.mock('./components/search-by-drug-orders/search-by-drug-orders.component', () => ({ default: () => null }));
vi.mock('./components/composition/composition.component', () => ({ default: () => null }));
vi.mock('./components/saved-cohorts/saved-cohorts.component', () => ({ default: () => null }));
vi.mock('./components/saved-queries/saved-queries.component', () => ({ default: () => null }));

const mockOpenmrsFetch = vi.mocked(openmrsFetch);

describe('the search results', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it('show only the parts of a name a patient has', async () => {
    mockOpenmrsFetch.mockImplementation(async (url: string) => {
      if (url.includes('/reportingrest/adhocquery')) {
        const row = (patientId: number, firstname: string | null, lastname: string | null) => ({
          patientId,
          firstname,
          lastname,
          gender: 'F',
          age: 30,
        });
        return { data: { rows: [row(1, null, null), row(2, 'Ann', null), row(3, null, 'Banda')] } } as never;
      }
      return { data: { results: [] } } as never;
    });
    render(<CohortBuilder />);

    await userEvent.click(screen.getByRole('button', { name: 'Run' }));

    // The first table is the results; the second is the search history.
    const names = () =>
      within(screen.getAllByRole('table')[0])
        .getAllByRole('row')
        .slice(1)
        .map((row) => within(row).getAllByRole('cell')[1].textContent);
    await waitFor(() => expect(names()).toHaveLength(3));
    expect(names()).toEqual(['', 'Ann', 'Banda']);
  });
});
