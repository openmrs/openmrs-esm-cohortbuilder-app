import React from 'react';
import userEvent from '@testing-library/user-event';
import { screen, render } from '@testing-library/react';
import { showModal } from '@openmrs/esm-framework';
import { type DefinitionDataRow } from '../../../types';
import SavedQueriesOptions from './saved-queries-options.component';

const mockShowModal = jest.mocked(showModal);

const query: DefinitionDataRow = {
  id: '1',
  name: 'Female Patients',
  description: 'Female Patients that are alive',
};

const testProps = {
  query: query,
  onViewQuery: jest.fn(),
  deleteQuery: jest.fn(),
};

const renderSavedQueriesOptions = (props = testProps) => {
  render(<SavedQueriesOptions {...props} />);
};

describe('Test the saved queries options', () => {
  it('should launch the delete query modal when the delete option is clicked', async () => {
    const user = userEvent.setup();
    renderSavedQueriesOptions();

    await user.click(screen.getByRole('button', { name: /options/i }));
    await user.click(screen.getByText(/delete/i));

    expect(mockShowModal).toHaveBeenCalledWith('delete-query-modal', {
      closeModal: expect.any(Function),
      onDelete: expect.any(Function),
      queryName: query.name,
      queryId: query.id,
      size: 'sm',
    });
  });
});
