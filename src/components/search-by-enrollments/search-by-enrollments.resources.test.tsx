import { describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useOpenmrsFetchAll } from '@openmrs/esm-framework';
import { usePrograms } from './search-by-enrollments.resources';

const mockUseOpenmrsFetchAll = vi.mocked(useOpenmrsFetchAll);

describe('usePrograms', () => {
  // The default program representation converts every workflow, and one bad workflow fails the whole
  // list with a 400. The dropdown only shows names, so it asks for nothing else.
  it('asks only for each program uuid and name', () => {
    mockUseOpenmrsFetchAll.mockReturnValue({
      data: [{ uuid: '64f950e6-1b07-4ac0-8e7e-f3e148f3463f', name: 'HIV Care and Treatment' }],
      isLoading: false,
    } as never);

    const { result } = renderHook(() => usePrograms());

    expect([...new Set(mockUseOpenmrsFetchAll.mock.calls.map(([url]) => url))]).toEqual([
      '/ws/rest/v1/program?v=custom:(uuid,name)',
    ]);
    expect(result.current.programs).toEqual([
      { id: 0, label: 'HIV Care and Treatment', value: '64f950e6-1b07-4ac0-8e7e-f3e148f3463f' },
    ]);
  });
});
