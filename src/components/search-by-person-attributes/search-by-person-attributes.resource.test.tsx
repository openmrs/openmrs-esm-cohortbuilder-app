import { describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useOpenmrsFetchAll } from '@openmrs/esm-framework';
import { usePersonAttributes } from './search-by-person-attributes.resource';

const mockUseOpenmrsFetchAll = vi.mocked(useOpenmrsFetchAll);

describe('usePersonAttributes', () => {
  it('asks only for each person attribute type uuid and display', () => {
    const option = { uuid: '14d4f066-15f5-102d-96e4-000c29c2a5d7', display: 'Telephone Number' };
    mockUseOpenmrsFetchAll.mockReturnValue({ data: [option], isLoading: false } as never);

    const { result } = renderHook(() => usePersonAttributes());

    expect([...new Set(mockUseOpenmrsFetchAll.mock.calls.map(([url]) => url))]).toEqual([
      '/ws/rest/v1/personattributetype?v=custom:(uuid,display)',
    ]);
    expect(result.current.personAttributes).toEqual([{ id: 0, label: 'Telephone Number', value: option.uuid }]);
  });
});
