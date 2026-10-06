import React from 'react';
import { vi, describe, it, expect, beforeEach, type Mock } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen } from '@testing-library/react';
import { openmrsFetch } from '@openmrs/esm-framework';
import { type DefinitionDataRow } from '../../types';
import { useQueries } from './saved-queries.resources';
import type * as SavedQueriesResources from './saved-queries.resources';
import SavedQueries from './saved-queries.component';

const mockUseQueries = vi.mocked(useQueries);
const mockOpenmrsFetch = openmrsFetch as Mock;

const mockQueries: DefinitionDataRow[] = [
  {
    id: '1',
    name: 'male alive',
    description: 'male patients that are alive',
  },
  {
    id: '2',
    name: 'Female ages between 10 and 30',
    description: 'male patients with ages between 10 and 30 years that are alive',
  },
];

vi.mock('./saved-queries.resources', async (importOriginal) => {
  const original = await importOriginal<typeof SavedQueriesResources>();
  return {
    ...original,
    useQueries: vi.fn(),
  };
});

describe('Test the saved queries component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should be able to search for a query', async () => {
    mockOpenmrsFetch.mockReturnValue({
      data: { results: mockQueries },
    });
    mockUseQueries.mockReturnValue({ queries: mockQueries, error: undefined, isLoading: false, mutate: vi.fn() });

    render(<SavedQueries onViewQuery={vi.fn()} />);

    // Wait for the table to be present
    const table = await screen.findByRole('table');
    expect(table).toBeInTheDocument();

    // Wait for the data to be loaded and verify each query
    for (const query of mockQueries) {
      const nameCell = await screen.findByText(query.name);
      expect(nameCell).toBeInTheDocument();
      expect(screen.getByText(query.description)).toBeInTheDocument();
    }
  });

  it('should act on the query shown in the row when the table is paginated', async () => {
    const user = userEvent.setup();
    const onViewQuery = vi.fn().mockResolvedValue(undefined);
    const queries: DefinitionDataRow[] = Array.from({ length: 11 }, (_, i) => ({
      id: `query-${i + 1}`,
      name: `Query ${i + 1}`,
      description: `Description ${i + 1}`,
    }));
    mockUseQueries.mockReturnValue({ queries, error: undefined, isLoading: false, mutate: vi.fn() });

    render(<SavedQueries onViewQuery={onViewQuery} />);

    await user.click(screen.getByRole('button', { name: /next page/i }));
    expect(screen.getByText('Query 11')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /options/i }));
    await user.click(screen.getByText(/view/i));

    expect(onViewQuery).toHaveBeenCalledWith('query-11');
  });

  it('should keep the remaining queries visible after the last row on page two is deleted', async () => {
    const user = userEvent.setup();
    const queries: DefinitionDataRow[] = Array.from({ length: 11 }, (_, i) => ({
      id: `query-${i + 1}`,
      name: `Query ${i + 1}`,
      description: 'description',
    }));
    const result = { queries, error: undefined, isLoading: false, mutate: vi.fn() };
    mockUseQueries.mockReturnValue(result);

    const view = render(<SavedQueries onViewQuery={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: /next page/i }));
    expect(screen.getByText('Query 11')).toBeInTheDocument();

    mockUseQueries.mockReturnValue({ ...result, queries: queries.slice(0, 10) });
    view.rerender(<SavedQueries onViewQuery={vi.fn()} />);

    expect(screen.getByText('Query 1')).toBeInTheDocument();
    expect(screen.getByText('Query 10')).toBeInTheDocument();
  });

  it('should only render the loading skeleton while the queries are loading', () => {
    mockUseQueries.mockReturnValue({ queries: [], error: undefined, isLoading: true, mutate: vi.fn() });

    render(<SavedQueries onViewQuery={vi.fn()} />);

    expect(screen.getAllByRole('columnheader', { name: 'Name' })).toHaveLength(1);
    expect(screen.queryByText(/there are no queries to display/i)).not.toBeInTheDocument();
  });
});
