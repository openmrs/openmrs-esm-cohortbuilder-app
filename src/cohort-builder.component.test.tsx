import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { openmrsFetch, showSnackbar } from '@openmrs/esm-framework';
import type { SearchByProps } from './types';
import CohortBuilder from './cohort-builder.component';

// Fills in the default text the way i18next does, so a message reads as it would on screen.
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, defaultValue = key, options: Record<string, unknown> = {}) =>
      defaultValue.replace(/{{(\w+)}}/g, (_, name) => String(options[name])),
  }),
}));

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
vi.mock('./components/saved-cohorts/saved-cohorts.component', () => ({
  default: ({ onViewCohort }: { onViewCohort: (cohortId: string) => Promise<void> }) => (
    <button onClick={() => onViewCohort('f4c0b5a2-3c84-4c76-bb7e-6c1b1b2e5a11')}>View cohort</button>
  ),
}));
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

describe('viewing a saved cohort', () => {
  /** Opens a cohort of three members, of whom those listed in `failing` fail to load with a 500. */
  async function viewCohort(failing: number[]) {
    mockOpenmrsFetch.mockImplementation(async (url: string) => {
      if (url.includes('/membership?')) {
        const results = [1, 2, 3].map((n) => ({
          uuid: `membership-${n}`,
          patientUuid: `patient-${n}`,
          startDate: '2020-01-01T00:00:00.000+0000',
          endDate: null,
          voided: false,
        }));
        return { data: { results, links: [] } } as never;
      }
      const n = Number(url.match(/patient\/patient-(\d)/)?.[1]);
      if (failing.includes(n)) {
        throw new Error('Internal Server Error');
      }
      return {
        data: {
          patientId: n,
          person: { gender: 'F', age: 30, preferredName: { givenName: 'Patient', familyName: `${n}` } },
        },
      } as never;
    });
    render(<CohortBuilder />);

    await userEvent.click(screen.getByRole('tab', { name: 'Saved Cohorts' }));
    await userEvent.click(screen.getByRole('button', { name: 'View cohort' }));
    await waitFor(() => expect(showSnackbar).toHaveBeenCalled());
  }

  it('reports success when every member loads', async () => {
    await viewCohort([]);

    expect(showSnackbar).toHaveBeenCalledWith({
      title: 'Search completed',
      kind: 'success',
      isLowContrast: true,
      subtitle: '3 results found',
    });
  });

  it('warns how many members it shows when some fail to load', async () => {
    await viewCohort([2]);

    expect(showSnackbar).toHaveBeenCalledWith({
      title: "Some of the cohort's members could not be shown",
      kind: 'warning',
      isLowContrast: true,
      subtitle: 'Showing 2 of 3 members',
    });
  });

  it('reports an error when no member loads', async () => {
    await viewCohort([1, 2, 3]);

    expect(showSnackbar).toHaveBeenCalledWith({
      title: 'Error',
      kind: 'error',
      isLowContrast: false,
      subtitle: "None of the cohort's members could be loaded",
    });
  });
});
