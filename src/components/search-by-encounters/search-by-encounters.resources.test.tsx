import { describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useOpenmrsFetchAll } from '@openmrs/esm-framework';
import { useEncounterTypes, useForms } from './search-by-encounters.resources';

const mockUseOpenmrsFetchAll = vi.mocked(useOpenmrsFetchAll);

const option = { uuid: 'e22e39fd-7db2-45e7-80f1-60fa0d5a4378', display: 'Admission' };

describe('encounter dropdowns', () => {
  it('ask only for each form uuid and display', () => {
    mockUseOpenmrsFetchAll.mockReturnValue({ data: [option], isLoading: false } as never);

    const { result } = renderHook(() => useForms());

    expect([...new Set(mockUseOpenmrsFetchAll.mock.calls.map(([url]) => url))]).toEqual(['/ws/rest/v1/form?v=custom:(uuid,display)']);
    expect(result.current.forms).toEqual([{ id: 0, label: 'Admission', value: option.uuid }]);
  });

  it('ask only for each encounter type uuid and display', () => {
    mockUseOpenmrsFetchAll.mockReturnValue({ data: [option], isLoading: false } as never);

    const { result } = renderHook(() => useEncounterTypes());

    expect([...new Set(mockUseOpenmrsFetchAll.mock.calls.map(([url]) => url))]).toEqual([
      '/ws/rest/v1/encountertype?v=custom:(uuid,display)',
    ]);
    expect(result.current.encounterTypes).toEqual([{ id: 0, label: 'Admission', value: option.uuid }]);
  });
});
