import React from 'react';
import { vi, describe, it, expect, beforeEach, type Mock } from 'vitest';
import { render, screen } from '@testing-library/react';
import { openmrsFetch } from '@openmrs/esm-framework';
import { type DefinitionDataRow } from '../../types';
import { getQueries } from './saved-queries.resources';
import type * as SavedQueriesResources from './saved-queries.resources';
import SavedQueries from './saved-queries.component';

const mockGetQueries = vi.mocked(getQueries);
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
    getQueries: vi.fn(),
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
    mockGetQueries.mockResolvedValue(mockQueries);

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
});
