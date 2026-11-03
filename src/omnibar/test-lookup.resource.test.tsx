import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { type FetchResponse, getSessionStore, openmrsFetch } from '@openmrs/esm-framework';
import { forgetTestLookups, knownTests, testLookupDelayMs, toTests, useTestLookup } from './test-lookup.resource';

const mockOpenmrsFetch = vi.mocked(openmrsFetch);

const viralLoad = '856AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
const qualitative = '1305AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
const hepB = '1693AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';

const answer = {
  results: [
    {
      uuid: viralLoad,
      display: 'HIV viral load',
      units: 'copies/mL',
      datatype: { hl7Abbreviation: 'NM' },
      names: [
        { name: 'HIV viral load', locale: 'en' },
        { name: 'Viral load', locale: 'en' },
        { name: 'Charge virale', locale: 'fr' },
        { name: 'Wingi wa virusi', locale: 'sw' },
      ],
    },
    { uuid: qualitative, display: 'HIV viral load, qualitative', datatype: { hl7Abbreviation: 'CWE' }, names: [] },
    { uuid: hepB, display: 'Hepatitis B viral load', units: 'IU/mL', datatype: { hl7Abbreviation: 'NM' } },
    { uuid: '../../session', display: 'Forged', units: '', datatype: { hl7Abbreviation: 'NM' } },
    'not an object',
  ],
};

const flush = () => act(() => Promise.resolve());
const wait = (ms: number) =>
  act(async () => {
    vi.advanceTimersByTime(ms);
  });

describe('looking up a test by name', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    forgetTestLookups();
    getSessionStore().setState({ loaded: true, session: { authenticated: true, user: { uuid: 'user-a' } } as never });
    mockOpenmrsFetch.mockResolvedValue({ data: answer } as FetchResponse);
  });

  afterEach(() => {
    vi.useRealTimers();
    getSessionStore().setState({ loaded: false, session: null });
  });

  it('keeps numeric concepts, with every name and synonym they have in any language, and their units', () => {
    expect(toTests(answer)).toEqual([
      {
        uuid: viralLoad,
        label: 'HIV viral load',
        aliases: ['Viral load', 'Charge virale', 'Wingi wa virusi'],
        units: 'copies/mL',
      },
      { uuid: hepB, label: 'Hepatitis B viral load', aliases: [], units: 'IU/mL' },
    ]);
    expect(toTests(null)).toEqual([]);
  });

  it('also knows a name without the unit in brackets at its end, as CIEL writes "Weight (kg)"', () => {
    const weight = '5089AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
    const creatinine = '790AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
    expect(
      toTests({
        results: [
          {
            uuid: weight,
            display: 'Weight (kg)',
            units: 'kg',
            datatype: { hl7Abbreviation: 'NM' },
            names: [{ name: 'WT', locale: 'en' }],
          },
          {
            uuid: creatinine,
            display: 'Serum creatinine (umol/L)',
            units: 'umol/L',
            datatype: { hl7Abbreviation: 'NM' },
            names: [{ name: 'Cr', locale: 'en' }],
          },
        ],
      }),
    ).toEqual([
      { uuid: weight, label: 'Weight (kg)', aliases: ['Weight', 'WT'], units: 'kg' },
      { uuid: creatinine, label: 'Serum creatinine (umol/L)', aliases: ['Serum creatinine', 'Cr'], units: 'umol/L' },
    ]);
  });

  it('asks once the words have stayed the same for a moment, for names, units and datatype only', async () => {
    const { rerender, result } = renderHook(({ words }) => useTestLookup(words, true, 'en'), {
      initialProps: { words: 'viral l' },
    });
    rerender({ words: 'viral lo' });
    rerender({ words: 'viral load' });
    expect(mockOpenmrsFetch).not.toHaveBeenCalled();
    await wait(testLookupDelayMs);
    await flush();

    expect(mockOpenmrsFetch).toHaveBeenCalledTimes(1);
    const url = new URL(mockOpenmrsFetch.mock.calls[0][0], 'http://localhost');
    expect(url.pathname.endsWith('/concept')).toBe(true);
    expect(url.searchParams.get('q')).toBe('viral load');
    expect(url.searchParams.get('v')).toBe(
      'custom:(uuid,display,units,datatype:(hl7Abbreviation),names:(name,locale))',
    );
    expect(knownTests('viral load', 'en')?.map(({ uuid }) => uuid)).toEqual([viralLoad, hepB]);
    expect(result.current).toBeGreaterThan(0);
  });

  it('remembers what it found, so the same words are never asked again', async () => {
    const { rerender } = renderHook(({ words }) => useTestLookup(words, true, 'en'), {
      initialProps: { words: 'viral load' },
    });
    await wait(testLookupDelayMs);
    await flush();
    rerender({ words: 'cd4' });
    rerender({ words: 'viral load' });
    await wait(testLookupDelayMs);
    await flush();
    expect(mockOpenmrsFetch).toHaveBeenCalledTimes(1);
  });

  it('asks nothing for no words, or while turned off', async () => {
    renderHook(() => useTestLookup(null, true, 'en'));
    renderHook(() => useTestLookup('viral load', false, 'en'));
    await wait(testLookupDelayMs * 2);
    expect(mockOpenmrsFetch).not.toHaveBeenCalled();
  });

  it('aborts a lookup the user has typed past', async () => {
    mockOpenmrsFetch.mockImplementationOnce(() => new Promise(() => {}));
    const { rerender } = renderHook(({ words }) => useTestLookup(words, true, 'en'), {
      initialProps: { words: 'viral' },
    });
    await wait(testLookupDelayMs);
    const signal = mockOpenmrsFetch.mock.calls[0][1]?.signal;
    rerender({ words: 'viral load' });
    expect(signal?.aborted).toBe(true);
  });

  it('forgets nothing it failed to find, and tries again next time', async () => {
    mockOpenmrsFetch.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    const { unmount } = renderHook(() => useTestLookup('viral load', true, 'en'));
    await wait(testLookupDelayMs);
    await flush();
    expect(knownTests('viral load', 'en')).toBeUndefined();
    unmount();
    renderHook(() => useTestLookup('viral load', true, 'en'));
    await wait(testLookupDelayMs);
    await flush();
    expect(knownTests('viral load', 'en')).toHaveLength(2);
  });

  it("forgets one user's lookups when the user changes", async () => {
    renderHook(() => useTestLookup('viral load', true, 'en'));
    await wait(testLookupDelayMs);
    await flush();
    expect(knownTests('viral load', 'en')).toHaveLength(2);
    getSessionStore().setState({ loaded: true, session: { authenticated: true, user: { uuid: 'user-b' } } as never });
    expect(knownTests('viral load', 'en')).toBeUndefined();
  });
});
