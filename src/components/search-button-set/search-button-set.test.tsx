import React from 'react';
import userEvent from '@testing-library/user-event';
import { screen, render } from '@testing-library/react';

import SearchButtonSet from './search-button-set';

describe('Test the search button set component', () => {
  it('should be able search and reset', async () => {
    const user = userEvent.setup();
    const handleSubmit = jest.fn();
    const handleReset = jest.fn();
    render(<SearchButtonSet onHandleReset={handleReset} onHandleSubmit={handleSubmit} isLoading={false} />);

    await user.click(screen.getByTestId('reset-btn'));
    expect(handleReset).toBeCalled();
    await user.click(screen.getByTestId('search-btn'));
    expect(handleSubmit).toBeCalled();
  });
});
