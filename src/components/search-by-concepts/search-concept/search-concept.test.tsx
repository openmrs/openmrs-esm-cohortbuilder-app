import React from 'react';
import userEvent from '@testing-library/user-event';
import { render, screen, waitFor } from '@testing-library/react';
import { type Concept } from '../../../types';
import { getConcepts } from './search-concept.resource';
import { SearchConcept } from './search-concept.component';

const mockGetConcepts = jest.mocked(getConcepts);

jest.mock('./search-concept.resource.ts', () => {
  const mockGetConcepts = jest.fn().mockImplementation((searchTerm) => {
    if (searchTerm === 'blood sugar') {
      return Promise.resolve(concepts);
    }
    return Promise.resolve([]);
  });
  return {
    getConcepts: mockGetConcepts,
  };
});

const concepts: Concept[] = [
  {
    uuid: '1000AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    units: '',
    answers: [],
    hl7Abbrev: 'ZZ',
    name: 'Whole blood sample',
    description: 'Blood samples not seperated into subtypes',
    datatype: {
      uuid: '8d4a4c94-c2cc-11de-8d13-0010c6dffd0f',
      name: 'N/A',
      description: 'Not associated with a datatype (e.g., term answers, sets)',
      hl7Abbreviation: 'ZZ',
    },
  },
  {
    uuid: '2a08da66-f326-4cac-b4cc-6efd68333847',
    units: 'mg/dl',
    answers: [],
    hl7Abbrev: 'NM',
    name: 'BLOOD SUGAR',
    description: 'Laboratory measurement of the glucose level in the blood.',
    datatype: {
      uuid: '8d4a4488-c2cc-11de-8d13-0010c6dffd0f',
      name: 'Numeric',
      description: 'Numeric value, including integer or float (e.g., creatinine, weight)',
      hl7Abbreviation: 'NM',
    },
  },
];

describe('Test the concept search component', () => {
  it('should be able to search for a concept', async () => {
    const user = userEvent.setup();
    mockGetConcepts.mockResolvedValue(concepts);

    let searchText = '';
    const setSearchText = jest.fn().mockImplementation((search: string) => (searchText = search));
    render(
      <SearchConcept concept={null} setConcept={jest.fn()} searchText={searchText} setSearchText={setSearchText} />,
    );
    const searchInput = screen.getByPlaceholderText('Search Concepts');
    await waitFor(() => user.click(searchInput));
    await waitFor(() => user.type(searchInput, 'blood s'));

    await waitFor(() => expect(mockGetConcepts).toBeCalledWith(searchText));
    expect(screen.getByText(concepts[0].name)).toBeInTheDocument();
    expect(screen.getByText(concepts[1].name)).toBeInTheDocument();
  });

  it('should be able to clear the current search value', async () => {
    const user = userEvent.setup();

    render(<SearchConcept concept={null} setConcept={jest.fn()} searchText={''} setSearchText={jest.fn()} />);

    const searchInput = screen.getByPlaceholderText('Search Concepts');
    await user.click(searchInput);
    await user.type(searchInput, 'blood');

    const clearButton = screen.getByLabelText('Clear search');
    await user.click(clearButton);
    expect(searchInput).toHaveValue('');
  });
});
