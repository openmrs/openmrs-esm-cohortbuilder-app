import { describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useOpenmrsFetchAll } from '@openmrs/esm-framework';
import { useCareSettings, useDrugs } from './search-by-drug-orders.resources';

const mockUseOpenmrsFetchAll = vi.mocked(useOpenmrsFetchAll);

const option = { uuid: '8891ef84-08d3-5e23-8d81-f7a528a2591d', display: 'Tenofovir' };

describe('drug order dropdowns', () => {
  it('ask only for each drug uuid and display', () => {
    mockUseOpenmrsFetchAll.mockReturnValue({ data: [option], isLoading: false } as never);

    const { result } = renderHook(() => useDrugs());

    expect([...new Set(mockUseOpenmrsFetchAll.mock.calls.map(([url]) => url))]).toEqual(['/ws/rest/v1/drug?v=custom:(uuid,display)']);
    expect(result.current.drugs).toEqual([{ id: 0, label: 'Tenofovir', value: option.uuid }]);
  });

  it('ask only for each care setting uuid and display', () => {
    mockUseOpenmrsFetchAll.mockReturnValue({ data: [option], isLoading: false } as never);

    const { result } = renderHook(() => useCareSettings());

    expect([...new Set(mockUseOpenmrsFetchAll.mock.calls.map(([url]) => url))]).toEqual([
      '/ws/rest/v1/caresetting?v=custom:(uuid,display)',
    ]);
    expect(result.current.careSettings).toEqual([{ id: 0, label: 'Tenofovir', value: option.uuid }]);
  });
});
