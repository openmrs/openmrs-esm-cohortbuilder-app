import React from 'react';
import { render, screen } from '@testing-library/react';
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
});
