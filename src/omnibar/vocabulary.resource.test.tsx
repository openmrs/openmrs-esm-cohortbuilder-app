import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, onTestFinished, vi } from 'vitest';
import { type FetchResponse, getSessionStore, openmrsFetch } from '@openmrs/esm-framework';
import { type CohortCriteriaConfig, parseCohortCriteria } from './parse-cohort-criteria';
import {
  forgetServerVocabulary,
  hasServerVocabulary,
  mergeVocabulary,
  toServerVocabulary,
  useServerVocabulary,
} from './vocabulary.resource';

const mockOpenmrsFetch = vi.mocked(openmrsFetch);

const hiv = '64f950e6-1b07-4ac0-8e7e-f3e148f3463f';
const tb = '9f144a34-3a4a-44a9-8486-6b7af6cc64f6';
const mch = '0b8c3c4e-2f9a-4b1e-9d5c-1a2b3c4d5e6f';
const admission = 'e22e39fd-7db2-45e7-80f1-60fa0d5a4378';
const vitals = '67a71486-1a54-468f-ac3e-7091a9a79584';

const programs = {
  results: [
    {
      uuid: tb,
      name: 'TB Program',
      retired: false,
      concept: {
        names: [
          { name: 'Tuberculosis treatment program', locale: 'en' },
          { name: 'Programme de traitement de la tuberculose', locale: 'fr' },
          { name: 'Programu ya kifua kikuu', locale: 'sw' },
        ],
      },
    },
    { uuid: mch, name: 'Maternal and Child Health Programme', retired: false, concept: null },
    {
      uuid: hiv,
      name: 'HIV Care and Treatment',
      retired: false,
      concept: { names: [{ name: 'HIV program', locale: 'en' }] },
    },
    { uuid: '1d2e3f40-1111-4222-8333-444455556666', name: 'Old Malaria Program', retired: true },
    { uuid: '../../session', name: 'Forged' },
    { uuid: '2d2e3f40-1111-4222-8333-444455556666', name: '' },
    'not an object',
  ],
};
const encounterTypes = {
  results: [
    { uuid: admission, name: 'Admission', retired: false },
    { uuid: vitals, name: 'Vitals', retired: false },
    { uuid: '3d2e3f40-1111-4222-8333-444455556666', name: 'Old Intake', retired: true },
  ],
};

function answerAsServer() {
  mockOpenmrsFetch.mockImplementation(async (url: string) => {
    if (url.includes('/program?')) return { data: programs } as FetchResponse;
    if (url.includes('/encountertype?')) return { data: encounterTypes } as FetchResponse;
    throw new Error(`unexpected ${url}`);
  });
}

/** Lets the hook's requests answer and its state settle. */
const flush = () => act(() => Promise.resolve());

const loggedIn = (uuid: string) =>
  getSessionStore().setState({ loaded: true, session: { authenticated: true, user: { uuid } } as never });

describe('the server vocabulary', () => {
  beforeEach(() => {
    forgetServerVocabulary();
    loggedIn('a1b2c3d4-0000-4000-8000-00000000000a');
    answerAsServer();
  });

  afterEach(() => {
    getSessionStore().setState({ loaded: false, session: null });
  });

  it('reads programs with every name their concept has, in any language, and encounter types', () => {
    const vocabulary = toServerVocabulary(programs, encounterTypes, 'fr_FR');
    expect(vocabulary.programs).toEqual([
      {
        uuid: tb,
        label: 'TB Program',
        aliases: [
          'TB',
          'Tuberculosis treatment program',
          'Tuberculosis treatment',
          'Programme de traitement de la tuberculose',
          'Programu ya kifua kikuu',
        ],
      },
      { uuid: mch, label: 'Maternal and Child Health Programme', aliases: ['Maternal and Child Health'] },
      { uuid: hiv, label: 'HIV Care and Treatment', aliases: ['HIV program', 'HIV'] },
    ]);
    expect(vocabulary.encounterTypes).toEqual([
      { uuid: admission, label: 'Admission', aliases: [] },
      { uuid: vitals, label: 'Vitals', aliases: [] },
    ]);
  });

  it('skips retired entries, entries without a name, uuids the builder would refuse, and anything not an object', () => {
    const vocabulary = toServerVocabulary(programs, encounterTypes, 'en');
    const uuids = [...vocabulary.programs, ...vocabulary.encounterTypes].map(({ uuid }) => uuid);
    expect(uuids).toEqual([tb, mch, hiv, admission, vitals]);
    expect(toServerVocabulary(null, 'nonsense', 'en')).toEqual({ programs: [], encounterTypes: [] });
  });

  it("keeps config's label for a program it also names, adding the server's names as aliases", () => {
    const merged = mergeVocabulary(
      { programs: [{ uuid: hiv, label: 'HIV clinic', aliases: ['art'] }], encounterTypes: [] },
      toServerVocabulary(programs, encounterTypes, 'en'),
    );
    expect(merged.programs.find(({ uuid }) => uuid === hiv)).toEqual({
      uuid: hiv,
      label: 'HIV clinic',
      aliases: ['art', 'HIV Care and Treatment', 'HIV program', 'HIV'],
    });
    expect(merged.programs.map(({ uuid }) => uuid)).toEqual([hiv, tb, mch]);
    expect(merged.encounterTypes.map(({ uuid }) => uuid)).toEqual([admission, vitals]);
  });

  it('lets the parser read every program and encounter type the server has, with no config', () => {
    const config: CohortCriteriaConfig = {
      drugCriteriaEnabled: false,
      drugGroups: [],
      ...mergeVocabulary({ programs: [], encounterTypes: [] }, toServerVocabulary(programs, encounterTypes, 'en')),
    };
    const criteria = (text: string) => parseCohortCriteria(text, config)?.criteria ?? null;
    expect(criteria('patients in the TB program')).toEqual([{ type: 'enrollment', programs: [tb] }]);
    expect(criteria('enrolled in tuberculosis treatment')).toEqual([{ type: 'enrollment', programs: [tb] }]);
    expect(criteria('enrolled in maternal and child health')).toEqual([{ type: 'enrollment', programs: [mch] }]);
    expect(criteria('women in the maternal and child health programme')).toEqual([
      { type: 'demographics', gender: 'female' },
      { type: 'enrollment', programs: [mch] },
    ]);
    expect(criteria('patients with a vitals encounter')).toEqual([{ type: 'encounter', encounterTypes: [vitals] }]);
    expect(criteria('patients in the malaria program')).toBeNull();
  });

  it('knows a hyphenated name without its hyphen too', () => {
    const config: CohortCriteriaConfig = {
      drugCriteriaEnabled: false,
      drugGroups: [],
      ...mergeVocabulary(
        { programs: [], encounterTypes: [] },
        toServerVocabulary({ results: [{ uuid: tb, name: 'MDR-TB Program' }] }, {}, 'en'),
      ),
    };
    const texts = ['enrolled in MDR TB', 'enrolled in MDR-TB', 'patients in the MDR TB program', 'MDR-TB clinic'];
    expect(texts.map((text) => [text, parseCohortCriteria(text, config)?.criteria])).toEqual(
      texts.map((text) => [text, [{ type: 'enrollment', programs: [tb] }]]),
    );
  });

  it('reads nothing for a name two programs share', () => {
    const twins = {
      results: [
        { uuid: tb, name: 'Child Health Program' },
        { uuid: mch, name: 'Child Health Programme' },
      ],
    };
    const config: CohortCriteriaConfig = {
      drugCriteriaEnabled: false,
      drugGroups: [],
      ...mergeVocabulary({ programs: [], encounterTypes: [] }, toServerVocabulary(twins, {}, 'en')),
    };
    expect(parseCohortCriteria('enrolled in child health', config)).toBeNull();
    expect(parseCohortCriteria('enrolled in the Child Health Program', config)?.criteria).toEqual([
      { type: 'enrollment', programs: [tb] },
    ]);
  });

  it('asks the server once per user, for uuids, names and concept names only', async () => {
    const view = renderHook(() => useServerVocabulary(true, 'en'));
    expect(view.result.current).toBeNull();
    await flush();
    expect(view.result.current.programs).toHaveLength(3);
    renderHook(() => useServerVocabulary(true, 'en'));
    await flush();

    const urls = mockOpenmrsFetch.mock.calls.map(([url]) => new URL(url, 'http://localhost'));
    expect(urls.map(({ pathname }) => pathname.split('/').at(-1))).toEqual(['program', 'encountertype']);
    expect(urls[0].searchParams.get('v')).toBe('custom:(uuid,name,retired,concept:(names:(name,locale)))');
    expect(urls[1].searchParams.get('v')).toBe('custom:(uuid,name,retired)');
    expect(urls.every((url) => url.searchParams.get('limit') === '100')).toBe(true);

    loggedIn('a1b2c3d4-0000-4000-8000-00000000000b');
    renderHook(() => useServerVocabulary(true, 'en'));
    await flush();
    expect(mockOpenmrsFetch).toHaveBeenCalledTimes(4);
  });

  it("forgets one user's vocabulary as soon as the user changes, even with no bar open", async () => {
    renderHook(() => useServerVocabulary(true, 'en')).unmount();
    await flush();
    expect(hasServerVocabulary()).toBe(true);
    getSessionStore().setState({ loaded: true, session: { authenticated: false } as never });
    expect(hasServerVocabulary()).toBe(false);
  });

  it('asks nothing while turned off', async () => {
    const { result } = renderHook(() => useServerVocabulary(false, 'en'));
    await flush();
    expect(result.current).toBeNull();
    expect(mockOpenmrsFetch).not.toHaveBeenCalled();
  });

  it('falls back to config alone, quietly, when the server refuses or fails, and tries again next time', async () => {
    mockOpenmrsFetch.mockRejectedValue(Object.assign(new Error('Forbidden'), { response: { status: 403 } }));
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    onTestFinished(() => error.mockRestore());
    const { result } = renderHook(() => useServerVocabulary(true, 'en'));
    await flush();
    expect(result.current).toEqual({ programs: [], encounterTypes: [] });
    expect(error).not.toHaveBeenCalled();

    answerAsServer();
    const { result: retried } = renderHook(() => useServerVocabulary(true, 'en'));
    await flush();
    expect(retried.current.programs).toHaveLength(3);
  });

  it('keeps the list that answered and asks again next time for the one that failed', async () => {
    let failures = 1;
    mockOpenmrsFetch.mockImplementation(async (url: string) => {
      if (url.includes('/program?')) return { data: programs } as FetchResponse;
      if (failures-- > 0) throw Object.assign(new Error('Service Unavailable'), { response: { status: 503 } });
      return { data: encounterTypes } as FetchResponse;
    });
    const { result } = renderHook(() => useServerVocabulary(true, 'en'));
    await flush();
    expect(result.current.programs).toHaveLength(3);
    expect(result.current.encounterTypes).toEqual([]);

    const { result: next } = renderHook(() => useServerVocabulary(true, 'en'));
    await flush();
    expect(next.current.programs).toHaveLength(3);
    expect(next.current.encounterTypes).toHaveLength(2);
    const paths = mockOpenmrsFetch.mock.calls.map(([url]) => new URL(url, 'http://localhost').pathname);
    expect(paths.map((path) => path.split('/').at(-1))).toEqual(['program', 'encountertype', 'encountertype']);
  });

  it("knows the programs by name when the server can't give their concepts, never saying why", async () => {
    mockOpenmrsFetch.mockImplementation(async (url: string) => {
      if (url.includes('concept')) {
        throw Object.assign(new Error('No row with the given identifier exists: [org.openmrs.Concept#5]'), {
          response: { status: 400 },
        });
      }
      if (url.includes('/program?')) {
        return { data: { results: [{ uuid: tb, name: 'TB Program', retired: false }] } } as FetchResponse;
      }
      return { data: encounterTypes } as FetchResponse;
    });
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    onTestFinished(() => error.mockRestore());
    const { result } = renderHook(() => useServerVocabulary(true, 'en'));
    await flush();
    expect(result.current).toEqual({
      programs: [{ uuid: tb, label: 'TB Program', aliases: ['TB'] }],
      encounterTypes: toServerVocabulary(null, encounterTypes, 'en').encounterTypes,
    });
    expect(error).not.toHaveBeenCalled();

    renderHook(() => useServerVocabulary(true, 'en'));
    await flush();
    const programUrls = mockOpenmrsFetch.mock.calls
      .map(([url]) => new URL(url, 'http://localhost'))
      .filter(({ pathname }) => pathname.endsWith('/program'));
    expect(programUrls.map((url) => url.searchParams.get('v'))).toEqual([
      'custom:(uuid,name,retired,concept:(names:(name,locale)))',
      'custom:(uuid,name,retired)',
    ]);
    expect(programUrls.every((url) => url.searchParams.get('limit') === '100')).toBe(true);
  });
});
