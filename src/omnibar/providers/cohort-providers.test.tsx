import React from 'react';
import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, onTestFinished, vi } from 'vitest';
import {
  type FetchResponse,
  getDefaultsFromConfigSchema,
  getSessionStore,
  openmrsFetch,
  restBaseUrl,
  useConfig,
} from '@openmrs/esm-framework';
import { type ConfigObject, configSchema } from '../../config-schema';
import routes from '../../routes.json';
import {
  OMNIBAR_CONTRACT_VERSION,
  type OmnibarContext,
  type OmnibarProviderProps,
  type OmnibarQueryHints,
  type OmnibarReport,
} from '../omnibar-contract';
import { savedSearchCacheMs, savedSearchDelayMs } from '../saved-search.resource';
import { forgetTestLookups, testLookupDelayMs } from '../test-lookup.resource';
import CohortBuilderProvider from './cohort-builder.provider';
import CohortCountProvider from './cohort-count.provider';
import SavedCohortsProvider from './saved-cohorts.provider';
import SavedQueriesProvider, { toQueryHits } from './saved-queries.provider';

// A real i18next instance, so plurals and default texts come out as the app shell shows them.
vi.mock('react-i18next', async () => {
  const { default: i18next } = await import('i18next');
  const i18n = i18next.createInstance();
  await i18n.init({ lng: 'en', resources: { en: { translation: {} } } });
  // Stable, as react-i18next's own t is.
  const t = i18n.t.bind(i18n);
  return { useTranslation: () => ({ t }) };
});

const mockUseConfig = vi.mocked(useConfig<ConfigObject>);
const mockOpenmrsFetch = vi.mocked(openmrsFetch);

const hiv = '64f950e6-1b07-4ac0-8e7e-f3e148f3463f';
const tdf = '0b8c3c4e-2f9a-4b1e-9d5c-1a2b3c4d5e6f';
const cohortUuid = '8673ee4f-e2ab-4077-ba55-4980f408773e';
const queryUuid = '5b0e0b4b-6d1d-4a8a-9d9e-0e6f2a1c3b4d';
const admission = 'e22e39fd-7db2-45e7-80f1-60fa0d5a4378';
const enrollmentKey = 'reporting.library.cohortDefinition.builtIn.patientsWithEnrollment';

const global: OmnibarContext = { scope: 'global', locale: 'en', workspaceGroup: null };
const inChart: OmnibarContext = { scope: 'patient', patientUuid: cohortUuid, locale: 'en' };

const providers = [
  ['count', CohortCountProvider],
  ['builder', CohortBuilderProvider],
  ['saved cohorts', SavedCohortsProvider],
  ['saved queries', SavedQueriesProvider],
] as const;

function testConfig(): ConfigObject {
  const defaults = getDefaultsFromConfigSchema(configSchema) as ConfigObject;
  return {
    ...defaults,
    drugCriteriaEnabled: true,
    omnibar: {
      ...defaults.omnibar,
      programs: [{ uuid: hiv, label: 'HIV Program', aliases: ['hiv'] }],
      drugGroups: [{ id: 'arv', label: 'ARVs', aliases: ['arvs'], drugUuids: [tdf], cielConceptUuids: [] }],
      encounterTypes: [{ uuid: admission, label: 'Admission', aliases: ['admission'] }],
      // Its own tests are in vocabulary.resource.test.tsx and below; off here, so requests are only counts.
      serverVocabulary: false,
      testResults: false,
    },
  };
}

function useTestConfig(change: (config: ConfigObject) => ConfigObject = (config) => config) {
  mockUseConfig.mockReturnValue(change(testConfig()));
}

/** Mounted as the host mounts a provider: with a host's props, and hints worked out by the host. */
function renderProvider(
  Provider: React.FC<OmnibarProviderProps>,
  query: string,
  context = global,
  hints?: OmnibarQueryHints,
) {
  const report = vi.fn<(report: OmnibarReport) => void>();
  const props = (next: string, nextContext: OmnibarContext, nextHints: OmnibarQueryHints) => ({
    query: next,
    context: nextContext,
    report,
    hints: nextHints,
    contractVersion: nextHints ? OMNIBAR_CONTRACT_VERSION : undefined,
  });
  const view = render(<Provider {...props(query, context, hints)} />);
  const rerender = (next: string, nextContext = context, nextHints = hints) =>
    view.rerender(<Provider {...props(next, nextContext, nextHints)} />);
  const last = () => report.mock.calls.at(-1)[0];
  return { report, rerender, last, unmount: view.unmount };
}

const decodeDefinition = (to: string) => {
  const param = new URLSearchParams(to.split('?')[1]).get('definition');
  return JSON.parse(Buffer.from(param, 'base64url').toString('utf8'));
};

describe('cohort providers in routes.json', () => {
  it.each<[string, string, number, Array<string>, object?]>([
    // Run Reports as well as the Get Patients reporting's cohort evaluation checks, so a user who can't
    // run the builder's own search never sees a count, however small.
    [
      'omnibar-cohort-count-provider',
      'cohortCountOmnibarProvider',
      20,
      ['Get Patients', 'Run Reports'],
      { command: { id: 'cohort', aliases: ['cohort', 'count'] } },
    ],
    ['omnibar-cohort-builder-provider', 'cohortBuilderOmnibarProvider', 30, ['Get Patients', 'Run Reports']],
    ['omnibar-saved-cohorts-provider', 'savedCohortsOmnibarProvider', 40, ['Get Patient Cohorts', 'Get Patients']],
    [
      'omnibar-saved-queries-provider',
      'savedQueriesOmnibarProvider',
      50,
      ['View Reports', 'Run Reports', 'Get Patients'],
    ],
  ])(
    'declares %s for global scope only, on contract 1, with the privileges its backend checks',
    (name, component, order, privileges, more = {}) => {
      const extension: Record<string, unknown> = routes.extensions.find((e) => e.name === name);
      expect(extension).toMatchObject({ component, slot: 'omnibar-providers-slot', privileges });
      expect(extension.meta).toEqual({ lane: 'navigate', scopes: ['global'], order, contract: 1, ...more });
      // The framework's defaults: online only.
      expect(extension).not.toHaveProperty('offline');
      expect(extension).not.toHaveProperty('online');
    },
  );

  it('no longer registers the "Build cohort" row, which the count row replaces', () => {
    expect(routes.extensions.map(({ name }) => name)).not.toContain('omnibar-cohort-criteria-provider');
  });
});

describe('every cohort provider', () => {
  beforeEach(() => useTestConfig());

  it.each(providers)(
    'the %s row reports on every query, idle when it has nothing, and echoes the query',
    (_, Provider) => {
      const { rerender, report } = renderProvider(Provider, '');
      for (const query of ['z', 'q', '']) {
        rerender(query);
      }
      expect(report.mock.calls.map(([{ query, status }]) => [query, status])).toEqual([
        ['', 'idle'],
        ['z', 'idle'],
        ['q', 'idle'],
        ['', 'idle'],
      ]);
      expect(report.mock.calls.every(([{ title }]) => typeof title === 'string' && title)).toBe(true);
    },
  );

  it.each(providers)(
    'the %s row stays idle and fetches nothing while the omnibar rows are turned off',
    async (_, Provider) => {
      vi.useFakeTimers();
      onTestFinished(() => {
        vi.useRealTimers();
      });
      useTestConfig((config) => ({ ...config, omnibar: { ...config.omnibar, enabled: false } }));
      const { last, rerender } = renderProvider(Provider, 'women aged 15-49 on ARVs');
      expect(last()).toMatchObject({ status: 'idle' });
      for (const query of ['cohort', 'hiv clinic']) {
        rerender(query);
        expect(last()).toMatchObject({ query, status: 'idle' });
      }
      await act(async () => {
        vi.advanceTimersByTime(savedSearchDelayMs * 2);
      });
      expect(last().results).toBeUndefined();
      expect(mockOpenmrsFetch).not.toHaveBeenCalled();
    },
  );

  it.each(providers)('the %s row offers nothing for text the host says looks like an identifier', (_, Provider) => {
    const { last } = renderProvider(Provider, 'cohort women', global, { looksLikeIdentifier: true });
    expect(last()).toMatchObject({ query: 'cohort women', status: 'idle' });
    expect(mockOpenmrsFetch).not.toHaveBeenCalled();
  });

  it.each(providers)(
    'the %s row works out the identifier shape itself on a host that gives no hints',
    (_, Provider) => {
      for (const query of ['cohort 100GEJ', 'women 1234567', 'MRN-1234']) {
        const { last } = renderProvider(Provider, query);
        expect(last()).toMatchObject({ query, status: 'idle' });
      }
      expect(mockOpenmrsFetch).not.toHaveBeenCalled();
    },
  );
});

describe('CohortBuilderProvider', () => {
  beforeEach(() => useTestConfig());

  it.each([
    'cohorts',
    'cohort',
    'Cohort Builder',
    'build cohort',
    'build a cohort of women',
    'find patients who are pregnant',
  ])('offers the Cohort Builder for %j', (query) => {
    const { last } = renderProvider(CohortBuilderProvider, query, global, { looksLikeIdentifier: false });
    expect(last()).toMatchObject({ query, status: 'ready', title: 'Cohorts' });
    expect(last().results).toEqual([
      {
        id: 'cohort-builder',
        title: 'Cohort Builder',
        subtitle: 'Find patients by age, gender, program, drug orders and more',
        target: { type: 'navigate', to: '${openmrsSpaBase}/cohort-builder' },
      },
    ]);
  });

  it.each(['co', 'coh', 'cohor', 'build', 'mary', '100GEJ', 'cd4', 'findings'])('stays quiet for %j', (query) => {
    const { last } = renderProvider(CohortBuilderProvider, query);
    expect(last()).toMatchObject({ status: 'idle' });
    expect(last().results).toBeUndefined();
  });

  it('offers nothing inside a chart', () => {
    const { last } = renderProvider(CohortBuilderProvider, 'cohort builder', inChart);
    expect(last()).toMatchObject({ status: 'idle' });
    expect(last().results).toBeUndefined();
  });
});

describe('CohortCountProvider', () => {
  let daysPassed = 0;
  const countDebounceMs = 600;

  const requests = () =>
    mockOpenmrsFetch.mock.calls.map(([url, init]) => ({
      url: new URL(url, 'http://localhost'),
      method: init?.method ?? 'GET',
      body: init?.body as { rowFilters: Array<{ key: string }>; customRowFilterCombination: string; columns: [] },
      signal: init?.signal,
    }));
  const settle = async (ms = countDebounceMs) => {
    await act(async () => {
      vi.advanceTimersByTime(ms);
    });
  };
  /** Answers every count: a GET of an evaluated cohort with `count`, an ad hoc query with ids. */
  const answer = ({ count = 3, ids = [1, 2, 3] }: { count?: unknown; ids?: unknown } = {}) =>
    mockOpenmrsFetch.mockImplementation(
      async (url: string) =>
        ({
          data: url.includes('/reportingrest/cohort/') ? { count, uuid: 'x' } : { result: { memberIds: ids } },
        } as FetchResponse),
    );

  beforeEach(() => {
    useTestConfig();
    vi.useFakeTimers();
    // A day on per test, so no test sees a count another one cached.
    vi.setSystemTime(Date.UTC(2026, 9, 17) + ++daysPassed * 86_400_000);
    answer();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows the row at once, counting, then the count, and opens the builder with the same definition', async () => {
    answer({ ids: Array.from({ length: 1204 }, (_, i) => i) });
    const { last, report } = renderProvider(CohortCountProvider, 'how many women aged 15-49 on ARVs', global, {
      looksLikeIdentifier: false,
    });
    const description =
      'Female Patients with ages between 15 and 49 years that are alive AND Patients who taking 1 drug on or after Today, 12:00 AM';
    expect(last()).toMatchObject({ status: 'loading', title: 'Patient count' });
    expect(last().results).toEqual([
      expect.objectContaining({ id: 'cohort-count', title: 'Counting…', subtitle: description }),
    ]);
    expect(mockOpenmrsFetch).not.toHaveBeenCalled();

    await settle();

    expect(last()).toMatchObject({ query: 'how many women aged 15-49 on ARVs', status: 'ready' });
    const [row] = last().results;
    expect(row).toMatchObject({ id: 'cohort-count', title: '1,204 patients', subtitle: description });
    expect(row).not.toHaveProperty('patient');
    const to = (row.target as { to: string }).to;
    expect(row.target.type).toBe('navigate');
    expect(to.startsWith('${openmrsSpaBase}/cohort-builder?definition=')).toBe(true);
    expect(decodeDefinition(to).criteria).toEqual([
      { type: 'demographics', gender: 'female', minAge: 15, maxAge: 49 },
      { type: 'drugOrder', drugs: [tdf], activeOnOrAfter: 'today' },
    ]);
    // The same row both times, so a highlight on it stays put when the number arrives.
    const rows = report.mock.calls.map(([sent]) => sent.results?.[0]).filter(Boolean);
    expect(new Set(rows.map(({ id, target }) => JSON.stringify({ id, target }))).size).toBe(1);
  });

  it("counts a composition as the builder's Composition tab composes it, with ids but no columns", async () => {
    const { last } = renderProvider(CohortCountProvider, 'men under 30 enrolled in hiv');
    await settle();

    expect(requests()).toHaveLength(1);
    const [{ url, method, body }] = requests();
    expect(url.pathname).toBe(`${restBaseUrl}/reportingrest/adhocquery`);
    expect(url.search).toBe('?v=rowFilters');
    expect(method).toBe('POST');
    expect(body.columns).toEqual([]);
    expect(body.rowFilters.map(({ key }) => key.replace('reporting.library.cohortDefinition.builtIn.', ''))).toEqual([
      'males',
      'upToAgeOnDate',
      'diedDuringPeriod',
      'patientsWithEnrollment',
    ]);
    expect(body.customRowFilterCombination).toBe('(1 AND 2 AND NOT 3) AND (4)');
    expect(last().results[0]).toMatchObject({
      title: '3 patients',
      subtitle: 'Male Patients with maximum age of 29 years that are alive AND Patients enrolled in HIV Program',
    });
  });

  it('asks only for the count of a program enrollment on its own, with the program as a list parameter', async () => {
    answer({ count: 1 });
    const { last } = renderProvider(CohortCountProvider, 'number of patients enrolled in HIV program');
    await settle();

    const [{ url, method }] = requests();
    expect(method).toBe('GET');
    expect(url.pathname).toBe(`${restBaseUrl}/reportingrest/cohort/${enrollmentKey}`);
    expect([...url.searchParams]).toEqual([
      ['v', 'ref'],
      ['programs', hiv],
    ]);
    expect(last().results[0]).toMatchObject({ title: '1 patient', subtitle: 'Patients enrolled in HIV Program' });
  });

  it('counts an encounter type through the ad hoc query, which leaves its other parameters open', async () => {
    renderProvider(CohortCountProvider, 'patients with an admission encounter');
    await settle();

    const [{ method, body }] = requests();
    expect(method).toBe('POST');
    expect(body.rowFilters).toEqual([
      expect.objectContaining({
        key: 'reporting.library.cohortDefinition.builtIn.encounterSearchAdvanced',
        parameterValues: { encounterTypeList: [admission] },
      }),
    ]);
  });

  it("counts a program known only from the server's own list, once the row may answer", async () => {
    const malaria = '7d2e3f40-1111-4222-8333-444455556666';
    useTestConfig((config) => ({ ...config, omnibar: { ...config.omnibar, serverVocabulary: true } }));
    mockOpenmrsFetch.mockImplementation(async (url: string) => {
      if (url.includes('/program?')) {
        return { data: { results: [{ uuid: malaria, name: 'Malaria Program', retired: false }] } } as FetchResponse;
      }
      if (url.includes('/encountertype?')) return { data: { results: [] } } as FetchResponse;
      return { data: { count: 12 } } as FetchResponse;
    });
    const { rerender, last } = renderProvider(CohortCountProvider, '100GEJ', global, { looksLikeIdentifier: true });
    await settle(0);
    // A patient identifier never mounts the vocabulary request.
    expect(mockOpenmrsFetch).not.toHaveBeenCalled();

    rerender('how many patients are enrolled in malaria?', global, { looksLikeIdentifier: false });
    await settle(0);
    rerender('how many patients are enrolled in malaria', global, { looksLikeIdentifier: false });
    expect(last().results[0]).toMatchObject({ title: 'Counting…', subtitle: 'Patients enrolled in Malaria Program' });
    await settle();
    expect(last().results[0].title).toBe('12 patients');
    expect(requests().filter(({ url }) => url.pathname.endsWith('/program'))).toHaveLength(1);
  });

  describe('by test results', () => {
    const viralLoad = '856AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
    const cd4 = '5497AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
    const concepts: Record<string, unknown> = {
      'viral load': {
        uuid: viralLoad,
        display: 'HIV viral load',
        units: 'copies/mL',
        datatype: { hl7Abbreviation: 'NM' },
        names: [{ name: 'Viral load', locale: 'en' }],
      },
      cd4: {
        uuid: cd4,
        display: 'CD4 count',
        units: 'cells/µL',
        datatype: { hl7Abbreviation: 'NM' },
        names: [{ name: 'CD4', locale: 'en' }],
      },
    };

    beforeEach(() => {
      forgetTestLookups();
      useTestConfig((config) => ({ ...config, omnibar: { ...config.omnibar, testResults: true } }));
      mockOpenmrsFetch.mockImplementation(async (url: string) => {
        const requested = new URL(url, 'http://localhost');
        if (requested.pathname.endsWith('/concept')) {
          const match = concepts[requested.searchParams.get('q')];
          return { data: { results: match ? [match] : [] } } as FetchResponse;
        }
        return { data: { result: { memberIds: [1, 2, 3, 4] } } } as FetchResponse;
      });
    });

    const lookups = () => requests().filter(({ url }) => url.pathname.endsWith('/concept'));
    const counts = () => requests().filter(({ url }) => url.pathname.endsWith('/adhocquery'));

    it("looks the test up by name, then counts it in the concept's units, as the builder will", async () => {
      const { last } = renderProvider(CohortCountProvider, 'women with viral load over 1000');
      expect(last()).toMatchObject({ status: 'idle' });
      await settle(testLookupDelayMs);
      expect(lookups().map(({ url }) => url.searchParams.get('q'))).toEqual(['viral load']);

      expect(last().results[0]).toMatchObject({
        title: 'Counting…',
        subtitle: 'Female Patients that are alive AND Patients with most recent HIV viral load > 1000 copies/mL',
      });
      await settle();
      expect(counts()).toHaveLength(1);
      expect(counts()[0].body.rowFilters.at(-1)).toEqual(
        expect.objectContaining({
          key: 'reporting.library.cohortDefinition.builtIn.numericObsSearchAdvanced',
          parameterValues: { timeModifier: 'LAST', question: viralLoad, operator1: 'GREATER_THAN', value1: '1000' },
        }),
      );
      expect(last().results[0].title).toBe('4 patients');
      expect(decodeDefinition((last().results[0].target as { to: string }).to).criteria.at(-1)).toEqual({
        type: 'numericObs',
        concept: viralLoad,
        operator: 'gt',
        value: 1000,
      });
    });

    it('looks up each test in turn for two in one question', async () => {
      const { last } = renderProvider(CohortCountProvider, 'viral load > 1000 and cd4 < 200');
      await settle(testLookupDelayMs);
      await settle(testLookupDelayMs);
      expect(lookups().map(({ url }) => url.searchParams.get('q'))).toEqual(['viral load', 'cd4']);
      expect(last().results[0].subtitle).toBe(
        'Patients with most recent HIV viral load > 1000 copies/mL AND Patients with most recent CD4 count < 200 cells/µL',
      );
    });

    it("offers nothing for a unit that is not the concept's", async () => {
      const { last } = renderProvider(CohortCountProvider, 'viral load over 1000 copies');
      await settle(testLookupDelayMs);
      await settle();
      expect(last()).toMatchObject({ status: 'idle' });
      expect(counts()).toHaveLength(0);
    });

    it('never looks up a name the parser did not ask about, nor anything while turned off', async () => {
      const { rerender } = renderProvider(CohortCountProvider, 'Mary Achieng');
      await settle(testLookupDelayMs);
      expect(lookups()).toHaveLength(0);
      useTestConfig((config) => ({ ...config, omnibar: { ...config.omnibar, testResults: false } }));
      rerender('women with viral load over 1000');
      await settle(testLookupDelayMs);
      expect(lookups()).toHaveLength(0);
    });

    it('offers the test being typed as a completion, from the lookup, before the question reads', async () => {
      concepts.vir = concepts['viral load'];
      const { last } = renderProvider(CohortCountProvider, 'women with vir');
      await settle(testLookupDelayMs);
      expect(last()).toMatchObject({ query: 'women with vir', status: 'idle' });
      expect(last().completions).toEqual([
        { insert: 'Viral load ', replace: 3, label: 'Viral load', detail: 'HIV viral load · copies/mL' },
      ]);
    });

    it('offers a known program after enrolled in, with no request', async () => {
      const { last } = renderProvider(CohortCountProvider, 'women enrolled in hi');
      expect(last().completions).toEqual([{ insert: 'HIV Program ', replace: 2, label: 'HIV Program' }]);
      await settle(testLookupDelayMs);
      expect(lookups()).toHaveLength(0);
    });

    it('offers no completion for a name, or inside a chart', async () => {
      const { last, rerender } = renderProvider(CohortCountProvider, 'patients with Mary Ach');
      await settle(testLookupDelayMs);
      expect(last().completions ?? []).toEqual([]);
      rerender('women enrolled in hi', inChart);
      expect(last().completions ?? []).toEqual([]);
      expect(lookups()).toHaveLength(0);
    });

    it('never looks up a test for text shaped like an identifier', async () => {
      renderProvider(CohortCountProvider, 'vl > 1000', global, { looksLikeIdentifier: true });
      await settle(testLookupDelayMs);
      expect(lookups()).toHaveLength(0);
    });
  });

  it('formats the count for the locale the host gives', async () => {
    answer({ ids: Array.from({ length: 1204 }, (_, i) => i) });
    const { last } = renderProvider(CohortCountProvider, 'women', { ...global, locale: 'fr_FR' });
    await settle();
    expect(last().results[0].title).toBe(`${new Intl.NumberFormat('fr-FR').format(1204)} patients`);
  });

  it('still shows the count for a locale the browser does not know', async () => {
    const { last } = renderProvider(CohortCountProvider, 'women', { ...global, locale: 'not a locale!' });
    await settle();
    expect(last().results[0].title).toBe('3 patients');
  });

  it('asks only once the parsed question has been still for the debounce, never per keystroke', async () => {
    const { rerender } = renderProvider(CohortCountProvider, 'women');
    for (const query of ['women u', 'women un', 'women under', 'women under 3', 'women under 30']) {
      await settle(countDebounceMs - 1);
      rerender(query);
    }
    expect(mockOpenmrsFetch).not.toHaveBeenCalled();
    await settle();
    expect(requests()).toHaveLength(1);
    expect(requests()[0].body.rowFilters.map(({ key }) => key.split('.').at(-1))).toEqual([
      'females',
      'upToAgeOnDate',
      'diedDuringPeriod',
    ]);
  });

  it('keeps counting when only the wording changes, since the definition is the same', async () => {
    const { rerender, last } = renderProvider(CohortCountProvider, 'women under 30');
    await settle(countDebounceMs / 2);
    rerender('how many women under 30');
    await settle(countDebounceMs / 2);
    expect(requests()).toHaveLength(1);
    await settle(0);
    expect(last()).toMatchObject({ query: 'how many women under 30', status: 'ready' });
  });

  it('waits the configured debounce', async () => {
    useTestConfig((config) => ({ ...config, omnibar: { ...config.omnibar, countDebounceMs: 2000 } }));
    renderProvider(CohortCountProvider, 'women');
    await settle(1999);
    expect(mockOpenmrsFetch).not.toHaveBeenCalled();
    await settle(1);
    expect(requests()).toHaveLength(1);
  });

  it('aborts a count the user has typed past and ignores its late answer', async () => {
    let answerFirst: (value: unknown) => void;
    mockOpenmrsFetch.mockImplementationOnce(() => new Promise((resolve) => (answerFirst = resolve)));
    const { rerender, last } = renderProvider(CohortCountProvider, 'women');
    await settle();
    const [{ signal }] = requests();

    rerender('men');
    expect(signal.aborted).toBe(true);
    expect(last()).toMatchObject({ query: 'men', status: 'loading' });
    await act(async () => answerFirst({ data: { result: { memberIds: [1, 2, 3, 4, 5, 6, 7] } } }));
    expect(last().results[0].title).toBe('Counting…');
    await settle();
    expect(last().results[0].title).toBe('3 patients');
  });

  it('remembers a count for the session, so asking again shows it at once', async () => {
    const view = renderProvider(CohortCountProvider, 'women under 30');
    await settle();
    view.rerender('men');
    await settle();
    view.rerender('how many women under 30?');
    expect(view.last()).toMatchObject({ status: 'ready' });
    expect(view.last().results[0].title).toBe('3 patients');
    expect(requests()).toHaveLength(2);
  });

  it('never shows one user a count remembered for another, on a workstation shared without a reload', async () => {
    const loggedIn = (uuid: string | null) =>
      getSessionStore().setState({
        loaded: true,
        session: uuid ? ({ authenticated: true, user: { uuid } } as never) : ({ authenticated: false } as never),
      });
    onTestFinished(() => {
      getSessionStore().setState({ loaded: false, session: null });
    });
    loggedIn('a1b2c3d4-0000-4000-8000-00000000000a');
    const { unmount } = renderProvider(CohortCountProvider, 'women under 30');
    await settle();
    expect(requests()).toHaveLength(1);
    unmount();

    loggedIn(null);
    loggedIn('a1b2c3d4-0000-4000-8000-00000000000b');
    const { last } = renderProvider(CohortCountProvider, 'women under 30');
    expect(last()).toMatchObject({ status: 'loading' });
    await settle();
    expect(requests()).toHaveLength(2);
  });

  it('drops an answer asked for by the user before, and asks again for the one logged in now', async () => {
    const loggedIn = (uuid: string) =>
      getSessionStore().setState({ loaded: true, session: { authenticated: true, user: { uuid } } as never });
    onTestFinished(() => {
      getSessionStore().setState({ loaded: false, session: null });
    });
    loggedIn('a1b2c3d4-0000-4000-8000-00000000000a');
    let answerFirst: (value: unknown) => void;
    mockOpenmrsFetch.mockImplementationOnce(() => new Promise((resolve) => (answerFirst = resolve)));
    const { last, report } = renderProvider(CohortCountProvider, 'women under 30');
    await settle();
    expect(requests()).toHaveLength(1);

    loggedIn('a1b2c3d4-0000-4000-8000-00000000000b');
    await act(async () => answerFirst({ data: { result: { memberIds: [1, 2, 3, 4, 5, 6, 7] } } }));
    expect(requests()).toHaveLength(2);
    expect(last()).toMatchObject({ status: 'ready' });
    expect(last().results[0].title).toBe('3 patients');
    expect(report.mock.calls.map(([sent]) => sent.results?.[0]?.title)).not.toContain('7 patients');
  });

  it('never shows the next user a count already on a mounted row, and asks again for them', async () => {
    const loggedIn = (uuid: string) =>
      getSessionStore().setState({ loaded: true, session: { authenticated: true, user: { uuid } } as never });
    onTestFinished(() => {
      getSessionStore().setState({ loaded: false, session: null });
    });
    loggedIn('a1b2c3d4-0000-4000-8000-00000000000a');
    answer({ ids: [1, 2, 3, 4, 5, 6, 7] });
    const { last, report } = renderProvider(CohortCountProvider, 'women under 30');
    await settle();
    expect(last().results[0].title).toBe('7 patients');

    answer();
    const seenByA = report.mock.calls.length;
    await act(async () => loggedIn('a1b2c3d4-0000-4000-8000-00000000000b'));
    await settle();
    const seenByB = report.mock.calls.slice(seenByA).map(([sent]) => sent.results?.[0]?.title);
    expect(seenByB).not.toContain('7 patients');
    expect(seenByB).toContain('Counting…');
    expect(last().results[0].title).toBe('3 patients');
    expect(requests()).toHaveLength(2);
  });

  it('stops asking again after three changes of user during one count, with a plain error', async () => {
    const users = ['a', 'b'].map((letter) => `a1b2c3d4-0000-4000-8000-00000000000${letter}`);
    let switches = 0;
    const flip = () =>
      getSessionStore().setState({
        loaded: true,
        session: { authenticated: true, user: { uuid: users[switches++ % 2] } } as never,
      });
    onTestFinished(() => {
      getSessionStore().setState({ loaded: false, session: null });
    });
    flip();
    // The session changes while every answer is on its way.
    mockOpenmrsFetch.mockImplementation(async () => {
      flip();
      return { data: { result: { memberIds: [1] } } } as FetchResponse;
    });
    const { last } = renderProvider(CohortCountProvider, 'women under 30');
    await settle();
    expect(requests()).toHaveLength(4);
    expect(last()).toEqual({ query: 'women under 30', title: 'Patient count', status: 'error' });
  });

  it('counts again on another day, since ages and "today" move', async () => {
    renderProvider(CohortCountProvider, 'women under 30').rerender('women under 30');
    await settle();
    vi.setSystemTime(Date.now() + 86_400_000);
    renderProvider(CohortCountProvider, 'women under 30');
    await settle();
    expect(requests()).toHaveLength(2);
  });

  it.each([
    ['fetch failing', new TypeError('Failed to fetch')],
    ['a gateway timeout', Object.assign(new Error('Gateway Timeout'), { response: { status: 504 } })],
    [
      'a request the server refuses',
      Object.assign(new Error('Failed to evaluate: women 15-49'), {
        response: { status: 400 },
        responseBody: { error: { message: 'Failed to evaluate: women 15-49' } },
      }),
    ],
    [
      'a server error',
      Object.assign(new Error('NullPointerException in CohortDefinitionService'), {
        response: { status: 500 },
        responseBody: { error: { message: 'NullPointerException in CohortDefinitionService' } },
      }),
    ],
  ])("says it is unavailable, and no more, never with the server's message, on %s", async (_, error) => {
    mockOpenmrsFetch.mockRejectedValue(error);
    const { last } = renderProvider(CohortCountProvider, 'women');
    await settle();
    expect(last()).toEqual({
      query: 'women',
      title: 'Patient count',
      status: 'error',
      detail: { state: 'unavailable' },
    });
  });

  it.each<[string, { count?: unknown; ids?: unknown }, string]>([
    ['a count that is not a number', { count: '12' }, 'enrolled in hiv'],
    ['a negative count', { count: -1 }, 'enrolled in hiv'],
    ['a fractional count', { count: 1.5 }, 'enrolled in hiv'],
    ['ids that are not a list', { ids: { 1: 1 } }, 'women'],
  ])('reports a plain error for %s', async (_, data, query) => {
    answer(data);
    const { last } = renderProvider(CohortCountProvider, query);
    await settle();
    expect(last()).toEqual({ query, title: 'Patient count', status: 'error' });
  });

  it('describes a configured label as plain text, neither escaped twice nor read as HTML', async () => {
    useTestConfig((config) => ({
      ...config,
      omnibar: { ...config.omnibar, programs: [{ uuid: hiv, label: "<b>Mother's</b> clinic", aliases: ['mch'] }] },
    }));
    const { last } = renderProvider(CohortCountProvider, 'enrolled in mch');
    const [row] = last().results;
    expect(row.subtitle).toBe("Patients enrolled in <b>Mother's</b> clinic");
    render(<span>{row.subtitle}</span>);
    expect(screen.getByText("Patients enrolled in <b>Mother's</b> clinic")).toBeInTheDocument();
  });

  it('offers nothing for a drug group while the top-level drugCriteriaEnabled is off', () => {
    useTestConfig((config) => ({ ...config, drugCriteriaEnabled: false }));
    const { last, rerender } = renderProvider(CohortCountProvider, 'women aged 15-49 on ARVs');
    expect(last()).toMatchObject({ status: 'idle' });
    expect(last().results).toBeUndefined();
    rerender('women aged 15-49');
    expect(last().results).toHaveLength(1);
  });

  it.each(['women with diabetes', 'how many HIV patients', 'how many', '123456'])(
    'offers nothing and asks nothing for %j, which it cannot fully read',
    async (query) => {
      const { last } = renderProvider(CohortCountProvider, query);
      await settle();
      expect(last()).toMatchObject({ query, status: 'idle' });
      expect(last().results).toBeUndefined();
      expect(mockOpenmrsFetch).not.toHaveBeenCalled();
    },
  );

  it('offers nothing when the definition is too big for a link', async () => {
    const drugUuids = Array.from({ length: 50 }, (_, i) => `${String(i).padStart(8, '0')}-0000-4000-8000-000000000000`);
    useTestConfig((config) => ({
      ...config,
      omnibar: {
        ...config.omnibar,
        drugGroups: ['a', 'b', 'c', 'd', 'e'].map((id) => ({
          id,
          label: id,
          aliases: [`drug${id}`],
          drugUuids,
          cielConceptUuids: [],
        })),
      },
    }));
    const { last } = renderProvider(CohortCountProvider, 'on druga on drugb on drugc on drugd on druge');
    await settle();
    expect(last()).toMatchObject({ status: 'idle' });
    expect(mockOpenmrsFetch).not.toHaveBeenCalled();
  });

  it('offers nothing and asks nothing inside a chart, even if mounted there', async () => {
    const { last } = renderProvider(CohortCountProvider, 'women on ARVs', inChart);
    await settle();
    expect(last()).toMatchObject({ status: 'idle' });
    expect(last().results).toBeUndefined();
    expect(mockOpenmrsFetch).not.toHaveBeenCalled();
  });

  it('stops counting when the bar leaves the question for a chart', async () => {
    const { rerender, last } = renderProvider(CohortCountProvider, 'women');
    rerender('women', inChart);
    await settle();
    expect(last()).toMatchObject({ status: 'idle' });
    expect(mockOpenmrsFetch).not.toHaveBeenCalled();
  });
});

describe('saved cohorts and saved queries', () => {
  let queryCounter = 0;
  let hoursPassed = 0;
  /** Cohort searches are cached by URL, so each test searches for words of its own. */
  const fresh = (word: string) => `${word}${++queryCounter}`;

  const respond = (data: unknown) => mockOpenmrsFetch.mockResolvedValue({ data } as FetchResponse);
  const settle = async () => {
    await act(async () => {
      vi.advanceTimersByTime(savedSearchDelayMs);
    });
  };
  const requestedUrl = (call = -1) => new URL(mockOpenmrsFetch.mock.calls.at(call)[0], 'http://localhost');

  beforeEach(() => {
    useTestConfig();
    vi.useFakeTimers();
    // An hour on per test, so no test sees a list another one cached.
    vi.setSystemTime(Date.UTC(2026, 9, 17) + ++hoursPassed * 3_600_000);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('lists saved cohorts that open in the cohort builder, skipping voided ones and bad uuids', async () => {
    respond({
      results: [
        { uuid: cohortUuid, name: 'HIV clinic', description: 'Everyone in care', size: 42, voided: false },
        { uuid: '2e9f6d2b-0c41-4b7e-9d0b-9f7c3b0d1a11', name: 'Old list', voided: true },
        { uuid: '../../../ws/rest/v1/session?leak=1', name: 'Forged', voided: false },
      ],
    });
    const query = fresh('hiv');
    const { last } = renderProvider(SavedCohortsProvider, query);
    expect(last()).toMatchObject({ query, status: 'loading', results: [] });

    await settle();

    expect(mockOpenmrsFetch).toHaveBeenCalledTimes(1);
    expect(requestedUrl().pathname).toBe(`/ws/rest/v1/cohort`);
    expect(requestedUrl().searchParams.get('q')).toBe(query);
    expect(last()).toMatchObject({ query, status: 'ready', title: 'Saved cohorts' });
    expect(last().results).toEqual([
      {
        id: `cohort:${cohortUuid}`,
        title: 'HIV clinic',
        subtitle: 'Everyone in care · 42 members',
        target: { type: 'navigate', to: `\${openmrsSpaBase}/cohort-builder?cohort=${cohortUuid}` },
      },
    ]);
  });

  it('says how many members a saved cohort has', async () => {
    respond({
      results: [
        { uuid: cohortUuid, name: 'One', size: 1 },
        { uuid: '2e9f6d2b-0c41-4b7e-9d0b-9f7c3b0d1a11', name: 'None', size: 0 },
        { uuid: '3f0a7e3c-1d52-4c8f-8e1c-0a8d4c1e2b22', name: 'Unknown' },
      ],
    });
    const { last } = renderProvider(SavedCohortsProvider, fresh('size'));
    await settle();
    expect(last().results.map((result) => result.subtitle)).toEqual([
      '1 member',
      '0 members',
      'Open in the Cohort Builder',
    ]);
  });

  it('asks for the saved query prefix and matches the typed text against the name without it', async () => {
    respond({
      results: [
        { uuid: queryUuid, name: '[AdHocDataExport] Women on ARVs' },
        { uuid: '2e9f6d2b-0c41-4b7e-9d0b-9f7c3b0d1a11', name: '[AdHocDataExport] Men over 50' },
        { uuid: '3f0a7e3c-1d52-4c8f-8e1c-0a8d4c1e2b22', name: 'Women report data set' },
      ],
    });
    const { last } = renderProvider(SavedQueriesProvider, 'WOMEN');

    await settle();

    const raw = mockOpenmrsFetch.mock.calls[0][0] as string;
    expect(raw).toContain('q=%5BAdHocDataExport%5D');
    expect(requestedUrl().pathname).toBe(`/ws/rest/v1/reportingrest/dataSetDefinition`);
    expect(requestedUrl().searchParams.get('q')).toBe('[AdHocDataExport]');
    expect(requestedUrl().searchParams.get('limit')).toBe('100');
    expect(last()).toMatchObject({ title: 'Saved queries' });
    expect(last().results).toEqual([
      {
        id: `query:${queryUuid}`,
        title: 'Women on ARVs',
        subtitle: 'Run in the Cohort Builder',
        target: { type: 'navigate', to: `\${openmrsSpaBase}/cohort-builder?query=${queryUuid}` },
      },
    ]);
  });

  it('serves every keystroke from one saved query list, and fetches it again after a minute', async () => {
    respond({ results: [{ uuid: queryUuid, name: '[AdHocDataExport] Women on ARVs' }] });
    const { rerender, last } = renderProvider(SavedQueriesProvider, 'wo');
    await settle();
    for (const query of ['wom', 'women', 'men']) {
      rerender(query);
      await settle();
      expect(last()).toMatchObject({
        query,
        status: 'ready',
        results: [expect.objectContaining({ id: `query:${queryUuid}` })],
      });
    }
    rerender('arv x');
    await settle();
    expect(last()).toMatchObject({ query: 'arv x', status: 'ready', results: [] });
    expect(mockOpenmrsFetch).toHaveBeenCalledTimes(1);

    // The next time the panel opens, the providers mount again.
    renderProvider(SavedQueriesProvider, 'women');
    await settle();
    expect(mockOpenmrsFetch).toHaveBeenCalledTimes(1);
    vi.setSystemTime(Date.now() + savedSearchCacheMs);
    renderProvider(SavedQueriesProvider, 'women');
    await settle();
    expect(mockOpenmrsFetch).toHaveBeenCalledTimes(2);
  });

  it('encodes the query in the request', async () => {
    respond({ results: [] });
    const query = `${fresh('a')}&v=full #x`;
    renderProvider(SavedCohortsProvider, query);

    await settle();

    const raw = mockOpenmrsFetch.mock.calls[0][0] as string;
    expect(raw.startsWith(`${restBaseUrl}/cohort?`)).toBe(true);
    expect(raw).not.toContain('&v=full #x');
    expect(requestedUrl().searchParams.get('q')).toBe(query);
    expect(requestedUrl().searchParams.get('v')).toBe('custom:(uuid,name,description,size,voided)');
  });

  it('waits for typing to pause and asks only for the last query', async () => {
    respond({ results: [] });
    const base = fresh('tb');
    const { rerender } = renderProvider(SavedCohortsProvider, base);
    act(() => vi.advanceTimersByTime(savedSearchDelayMs - 50));
    rerender(`${base} c`);
    act(() => vi.advanceTimersByTime(savedSearchDelayMs - 50));
    rerender(`${base} cl`);

    await settle();

    expect(mockOpenmrsFetch).toHaveBeenCalledTimes(1);
    expect(requestedUrl().searchParams.get('q')).toBe(`${base} cl`);
  });

  it('aborts a request the user has typed past and ignores its late answer', async () => {
    let resolveFirst: (response: FetchResponse) => void;
    mockOpenmrsFetch.mockImplementationOnce(() => new Promise((resolve) => (resolveFirst = resolve)));
    const first = fresh('mal');
    const { rerender, last } = renderProvider(SavedCohortsProvider, first);
    await settle();
    const firstSignal = (mockOpenmrsFetch.mock.calls[0][1] as RequestInit).signal;
    expect(firstSignal.aborted).toBe(false);

    respond({ results: [] });
    rerender(`${first}aria`);
    expect(firstSignal.aborted).toBe(true);
    await settle();
    await act(async () => {
      resolveFirst({ data: { results: [{ uuid: cohortUuid, name: 'Stale' }] } } as FetchResponse);
    });

    expect(last()).toMatchObject({ query: `${first}aria`, status: 'ready', results: [] });
  });

  it('remembers an answer, so going back to a query does not fetch it again', async () => {
    respond({ results: [{ uuid: cohortUuid, name: 'ANC' }] });
    const query = fresh('anc');
    const { rerender, last } = renderProvider(SavedCohortsProvider, query);
    await settle();
    rerender(`${query}x`);
    await settle();
    expect(mockOpenmrsFetch).toHaveBeenCalledTimes(2);

    rerender(query);
    expect(last()).toMatchObject({ query, status: 'ready', results: [expect.objectContaining({ title: 'ANC' })] });
    await settle();
    expect(mockOpenmrsFetch).toHaveBeenCalledTimes(2);
  });

  it('needs two characters and stays out of charts', async () => {
    const { rerender, last } = renderProvider(SavedCohortsProvider, 'h');
    await settle();
    expect(last()).toMatchObject({ status: 'idle' });
    rerender(fresh('hiv'), inChart);
    await settle();
    expect(last()).toMatchObject({ status: 'idle' });

    const { last: lastQueries } = renderProvider(SavedQueriesProvider, fresh('hiv'), inChart);
    await settle();
    expect(lastQueries()).toMatchObject({ status: 'idle' });
    expect(mockOpenmrsFetch).not.toHaveBeenCalled();
  });

  it.each(['100GEJ', '4861TU-4', '123456', 'MRN-1234'])('leaves the id %j to patient search', async (id) => {
    const { last: lastCohorts } = renderProvider(SavedCohortsProvider, id);
    const { last: lastQueries } = renderProvider(SavedQueriesProvider, id);
    await settle();
    expect(lastCohorts()).toMatchObject({ query: id, status: 'idle' });
    expect(lastQueries()).toMatchObject({ query: id, status: 'idle' });
    expect(mockOpenmrsFetch).not.toHaveBeenCalled();
  });

  it.each([
    ['offline', new TypeError('Failed to fetch')],
    ['a gateway timeout', Object.assign(new Error('Gateway Timeout'), { response: { status: 504 } })],
    ['the server down behind a proxy', Object.assign(new Error('Service Unavailable'), { response: { status: 503 } })],
  ])('reports one quiet unavailable line when %s', async (_, failure) => {
    mockOpenmrsFetch.mockRejectedValue(failure);
    const { last: lastCohorts } = renderProvider(SavedCohortsProvider, fresh('art'));
    const { last: lastQueries } = renderProvider(SavedQueriesProvider, fresh('art'));
    await settle();
    for (const [report, title] of [
      [lastCohorts(), 'Saved cohorts'],
      [lastQueries(), 'Saved queries'],
    ] as const) {
      expect(report).toEqual({ query: expect.any(String), title, status: 'error', detail: { state: 'unavailable' } });
    }
  });

  it('reports any other failed search as a plain error', async () => {
    mockOpenmrsFetch.mockRejectedValue(Object.assign(new Error('Forbidden'), { response: { status: 403 } }));
    const { last } = renderProvider(SavedQueriesProvider, fresh('art'));
    await settle();
    expect(last()).toEqual({ query: expect.any(String), title: 'Saved queries', status: 'error' });
  });

  it('skips entries that are not objects and lists the rest', async () => {
    respond({ results: [null, 'HIV clinic', 42, [], { uuid: cohortUuid, name: 'HIV clinic', size: 3 }] });
    const { last: lastCohorts } = renderProvider(SavedCohortsProvider, fresh('hiv'));
    await settle();
    expect(lastCohorts()).toMatchObject({
      status: 'ready',
      results: [expect.objectContaining({ title: 'HIV clinic' })],
    });
    expect(lastCohorts().results).toHaveLength(1);

    respond({ results: [null, 'x', { uuid: queryUuid, name: '[AdHocDataExport] HIV clinic' }] });
    const { last: lastQueries } = renderProvider(SavedQueriesProvider, 'hiv');
    await settle();
    expect(lastQueries()).toMatchObject({
      status: 'ready',
      results: [expect.objectContaining({ title: 'HIV clinic' })],
    });
    expect(lastQueries().results).toHaveLength(1);
  });

  it.each([
    ['saved cohorts', SavedCohortsProvider, 'Saved cohorts'],
    ['saved queries', SavedQueriesProvider, 'Saved queries'],
  ])(
    'reports a plain error for %s, never stuck searching, when the answer cannot be read',
    async (_, Provider, title) => {
      respond({ results: 'not a list' });
      const query = fresh('art');
      const { last } = renderProvider(Provider, query);
      await settle();
      expect(last()).toEqual({ query, title, status: 'error' });

      // Not remembered: the next mount asks again.
      respond({ results: [] });
      const calls = mockOpenmrsFetch.mock.calls.length;
      const { last: again } = renderProvider(Provider, query);
      await settle();
      expect(mockOpenmrsFetch.mock.calls.length).toBe(calls + 1);
      expect(again()).toMatchObject({ query, status: 'ready', results: [] });
    },
  );

  it('skips saved cohorts and saved queries with no name to show', async () => {
    respond({
      results: [
        { uuid: '2e9f6d2b-0c41-4b7e-9d0b-9f7c3b0d1a11', name: '   ' },
        { uuid: '3f0a7e3c-1d52-4c8f-8e1c-0a8d4c1e2b22' },
        // Only format characters: a zero-width space, a byte order mark and a word joiner.
        { uuid: '4a1b8f4d-2e63-4d9a-9f2d-1b9e5d2f3c33', name: '\u200B \uFEFF\u2060' },
        { uuid: cohortUuid, name: 'Named' },
      ],
    });
    const { last: lastCohorts } = renderProvider(SavedCohortsProvider, fresh('na'));
    await settle();
    expect(lastCohorts().results.map((result) => result.title)).toEqual(['Named']);

    // A saved query whose name is only the prefix can't match typed text, so its mapper is checked directly.
    expect(
      toQueryHits({
        results: [
          { uuid: '2e9f6d2b-0c41-4b7e-9d0b-9f7c3b0d1a11', name: '[AdHocDataExport]' },
          { uuid: '3f0a7e3c-1d52-4c8f-8e1c-0a8d4c1e2b22', name: '[AdHocDataExport]   ' },
          { uuid: '4a1b8f4d-2e63-4d9a-9f2d-1b9e5d2f3c33', name: '[AdHocDataExport] \u200B\uFEFF' },
          { uuid: queryUuid, name: '[AdHocDataExport] Named' },
        ],
      }).map((hit) => hit.name),
    ).toEqual(['Named']);
  });

  it('shows a description only when it is text, so the host never gets an object to draw', async () => {
    respond({
      results: [
        { uuid: cohortUuid, name: 'Object', description: { x: 1 }, size: 3 },
        { uuid: '2e9f6d2b-0c41-4b7e-9d0b-9f7c3b0d1a11', name: 'Number', description: 42 },
        { uuid: '3f0a7e3c-1d52-4c8f-8e1c-0a8d4c1e2b22', name: 'Text', description: 'Everyone in care' },
      ],
    });
    const { last: lastCohorts } = renderProvider(SavedCohortsProvider, fresh('de'));
    await settle();
    expect(lastCohorts().results.map((result) => result.subtitle)).toEqual([
      '3 members',
      'Open in the Cohort Builder',
      'Everyone in care',
    ]);

    respond({
      results: [
        { uuid: cohortUuid, name: '[AdHocDataExport] Desc object', description: { x: 1 } },
        { uuid: '2e9f6d2b-0c41-4b7e-9d0b-9f7c3b0d1a11', name: '[AdHocDataExport] Desc number', description: 42 },
        { uuid: '3f0a7e3c-1d52-4c8f-8e1c-0a8d4c1e2b22', name: '[AdHocDataExport] Desc text', description: 'Women' },
      ],
    });
    const { last: lastQueries } = renderProvider(SavedQueriesProvider, 'desc');
    await settle();
    expect(lastQueries().results.map((result) => result.subtitle)).toEqual([
      'Run in the Cohort Builder',
      'Run in the Cohort Builder',
      'Women',
    ]);
    expect(
      [...lastCohorts().results, ...lastQueries().results].every((result) => typeof result.subtitle === 'string'),
    ).toBe(true);
  });

  it('never searches an empty query, even when savedSearchMinCharacters is set below 1', async () => {
    useTestConfig((config) => ({ ...config, omnibar: { ...config.omnibar, savedSearchMinCharacters: 0 } }));
    respond({ results: [] });
    const { last: lastCohorts } = renderProvider(SavedCohortsProvider, '');
    const { last: lastQueries } = renderProvider(SavedQueriesProvider, '');
    await settle();
    expect(lastCohorts()).toMatchObject({ status: 'idle' });
    expect(lastQueries()).toMatchObject({ status: 'idle' });
    expect(mockOpenmrsFetch).not.toHaveBeenCalled();
  });
});
