import React from 'react';
import { vi, describe, it, expect } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen, waitFor } from '@testing-library/react';
import DeleteQueryModal from './delete-query.modal';

describe('DeleteQueryModal', () => {
  it('deletes the query and closes the modal', async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn().mockResolvedValue(undefined);
    const closeModal = vi.fn();

    render(<DeleteQueryModal closeModal={closeModal} onDelete={onDelete} queryName="male alive" queryId="query-1" />);

    await user.click(screen.getByRole('button', { name: /delete/i }));

    expect(onDelete).toHaveBeenCalledWith('query-1');
    await waitFor(() => expect(closeModal).toHaveBeenCalled());
  });
});
