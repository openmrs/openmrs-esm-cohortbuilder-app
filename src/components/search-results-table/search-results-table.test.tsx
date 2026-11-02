import React from 'react';
import { vi, describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SearchResultsTable from './search-results-table.component';

const mockPatients = [
  {
    firstname: 'Horatio',
    gender: 'M',
    patientId: 2,
    age: 81,
    lastname: 'Hornblower',
    id: '2',
    name: 'Horatio Hornblower',
  },
  {
    firstname: 'John',
    gender: 'M',
    patientId: 3,
    age: 47,
    lastname: 'Patient',
    id: '3',
    name: 'John Patient',
  },
];

describe('Test the search results component', () => {
  it("should render a message when there's no results to display", async () => {
    render(<SearchResultsTable patients={[]} />);

    expect(screen.getByText('There are no data to display')).toBeInTheDocument();
  });

  it('should display the search results', () => {
    render(<SearchResultsTable patients={mockPatients} />);

    const rows = screen.getAllByRole('row');
    const cells = screen.getAllByRole('cell');
    expect(rows).toHaveLength(mockPatients.length + 1);
    expect(cells[1]).toHaveTextContent(mockPatients[0].name);
    expect(cells[5]).toHaveTextContent(mockPatients[1].name);
    expect(cells[0]).toHaveTextContent(mockPatients[0].id);
    expect(cells[4]).toHaveTextContent(mockPatients[1].id);
  });

  it('shows the first page of new results after a new search', async () => {
    const user = userEvent.setup();
    const makePatients = (count: number, prefix: string) =>
      Array.from({ length: count }, (_, index) => ({
        ...mockPatients[0],
        id: `${prefix}-${index + 1}`,
        patientId: index + 1,
        name: `${prefix} patient ${index + 1}`,
      }));

    const { rerender } = render(<SearchResultsTable patients={makePatients(60, 'first')} />);
    await user.click(screen.getByRole('button', { name: /next page/i }));
    await user.click(screen.getByRole('button', { name: /next page/i }));
    expect(screen.getByText('first patient 21')).toBeInTheDocument();

    rerender(<SearchResultsTable patients={makePatients(15, 'second')} />);

    expect(screen.getAllByRole('row')).toHaveLength(11);
    expect(screen.getByText('second patient 1')).toBeInTheDocument();
    expect(screen.getByText(/1.10 of 15 items/i)).toBeInTheDocument();
  });
});
