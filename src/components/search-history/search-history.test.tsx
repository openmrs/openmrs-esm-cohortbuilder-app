import React from 'react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen } from '@testing-library/react';
import { showModal } from '@openmrs/esm-framework';
import SearchHistory from './search-history.component';

const mockGetSearchHistory = vi.fn();

vi.mock('./search-history.utils.ts', () => ({
  getSearchHistory: () => mockGetSearchHistory(),
}));

const mockSearchHistory = [
  {
    description: 'Patients with NO Chronic viral hepatitis',
    patients: [
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
    ],
    parameters: {
      type: 'org.openmrs.module.reporting.dataset.definition.PatientDataSetDefinition',
      columns: [
        {
          name: 'firstname',
          key: 'reporting.library.patientDataDefinition.builtIn.preferredName.givenName',
          type: 'org.openmrs.module.reporting.data.patient.definition.PatientDataDefinition',
        },
        {
          name: 'lastname',
          key: 'reporting.library.patientDataDefinition.builtIn.preferredName.familyName',
          type: 'org.openmrs.module.reporting.data.patient.definition.PatientDataDefinition',
        },
        {
          name: 'gender',
          key: 'reporting.library.patientDataDefinition.builtIn.gender',
          type: 'org.openmrs.module.reporting.data.patient.definition.PatientDataDefinition',
        },
        {
          name: 'age',
          key: 'reporting.library.patientDataDefinition.builtIn.ageOnDate.fullYears',
          type: 'org.openmrs.module.reporting.data.patient.definition.PatientDataDefinition',
        },
        {
          name: 'patientId',
          key: 'reporting.library.patientDataDefinition.builtIn.patientId',
          type: 'org.openmrs.module.reporting.data.patient.definition.PatientDataDefinition',
        },
      ],
      rowFilters: [
        {
          key: 'reporting.library.cohortDefinition.builtIn.codedObsSearchAdvanced',
          parameterValues: {
            operator1: 'LESS_THAN',
            question: '145131AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
            timeModifier: 'NO',
          },
          type: 'org.openmrs.module.reporting.dataset.definition.PatientDataSetDefinition',
        },
      ],
      customRowFilterCombination: '1',
    },
    id: '1',
    results: '2',
  },
];

describe('Test the search history component', () => {
  beforeEach(() => {
    mockGetSearchHistory.mockReturnValue(mockSearchHistory);
  });

  it("should render a message when there's no history to display", async () => {
    render(<SearchHistory isHistoryUpdated={false} setIsHistoryUpdated={vi.fn()} />);

    expect(screen.getByText('There are no data to display')).toBeInTheDocument();
  });

  it('should display the search history', async () => {
    render(<SearchHistory isHistoryUpdated={true} setIsHistoryUpdated={vi.fn()} />);

    expect(screen.getByText(/clear search history/i)).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText(mockSearchHistory[0].description)).toBeInTheDocument();
  });

  it('should act on the search item shown in the row when the table is paginated', async () => {
    const user = userEvent.setup();
    const searchHistory = Array.from({ length: 11 }, (_, i) => ({
      ...mockSearchHistory[0],
      id: `${i + 1}`,
      description: `Search ${i + 1}`,
    }));
    mockGetSearchHistory.mockReturnValue(searchHistory);

    render(<SearchHistory isHistoryUpdated={true} setIsHistoryUpdated={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: /next page/i }));
    await user.click(screen.getByRole('button', { name: /options/i }));
    await user.click(screen.getByText(/delete from history/i));

    expect(vi.mocked(showModal)).toHaveBeenCalledWith(
      'clear-item-from-search-history-modal',
      expect.objectContaining({ searchItemName: 'Search 11' }),
    );
  });

  it('should not jump back to an out-of-range page when the history grows again', async () => {
    const user = userEvent.setup();
    const setIsHistoryUpdated = vi.fn();
    const history = Array.from({ length: 11 }, (_, i) => ({
      ...mockSearchHistory[0],
      id: `${i + 1}`,
      description: `Search ${i + 1}`,
    }));
    mockGetSearchHistory.mockReturnValue(history);

    const view = render(<SearchHistory isHistoryUpdated={true} setIsHistoryUpdated={setIsHistoryUpdated} />);
    const updateHistory = (items: typeof history) => {
      mockGetSearchHistory.mockReturnValue(items);
      view.rerender(<SearchHistory isHistoryUpdated={false} setIsHistoryUpdated={setIsHistoryUpdated} />);
      view.rerender(<SearchHistory isHistoryUpdated={true} setIsHistoryUpdated={setIsHistoryUpdated} />);
    };

    await user.click(screen.getByRole('button', { name: /next page/i }));
    expect(screen.getByText('Search 11')).toBeInTheDocument();

    updateHistory(history.slice(0, 10));
    expect(screen.getByText('Search 1')).toBeInTheDocument();

    updateHistory(history);
    expect(screen.getByText('Search 1')).toBeInTheDocument();
    expect(screen.queryByText('Search 11')).not.toBeInTheDocument();
  });
});
