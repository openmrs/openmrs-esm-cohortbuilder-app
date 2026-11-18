import React from 'react';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { act, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { type FetchResponse, getDefaultsFromConfigSchema, openmrsFetch, useConfig } from '@openmrs/esm-framework';
import { type ConfigObject, configSchema } from './config-schema';
import routes from './routes.json';
import {
  looksLikeIdentifier,
  OMNIBAR_CONTRACT_VERSION,
  type OmnibarProviderProps,
  type OmnibarReport,
  withProviderBoundary,
} from './omnibar/omnibar-contract';
import CohortBuilderProvider from './omnibar/providers/cohort-builder.provider';
import CohortCountProvider from './omnibar/providers/cohort-count.provider';
import SavedCohortsProvider from './omnibar/providers/saved-cohorts.provider';
import SavedQueriesProvider from './omnibar/providers/saved-queries.provider';
import { savedSearchDelayMs } from './omnibar/saved-search.resource';

// index.ts can't be imported under vitest (webpack's require.context), so its registration is read as
// text, and the providers below are wrapped exactly as it wraps them.
const indexSource = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'index.ts'), 'utf8');

const providerModules = {
  'omnibar-cohort-count-provider': ['cohort-count', CohortCountProvider],
  'omnibar-cohort-builder-provider': ['cohort-builder', CohortBuilderProvider],
  'omnibar-saved-cohorts-provider': ['saved-cohorts', SavedCohortsProvider],
  'omnibar-saved-queries-provider': ['saved-queries', SavedQueriesProvider],
} as const;
const providerExtensions = Object.keys(providerModules);

describe('registering the cohort providers', () => {
  it.each(Object.entries(providerModules))(
    'loads %s lazily, from its own module, wrapped in the contract boundary named after it',
    (name, [file]) => {
      const { component } = routes.extensions.find((extension) => extension.name === name);
      expect(indexSource).toContain(
        `export const ${component} = getAsyncLifecycle(\n  () => import('./omnibar/providers/${file}.provider').then(bounded('${name}')),\n  options,\n);`,
      );
    },
  );

  it('never imports provider code statically, so the omnibar loads none of the builder', () => {
    expect(indexSource).not.toMatch(/^import .*omnibar\/(providers|parse|saved|cohort)/m);
    expect(indexSource).toContain(
      'const bounded =\n  (name: string) =>\n  ({ default: Provider }) => ({ default: withProviderBoundary(Provider, name) });',
    );
  });
});

/**
 * The four providers as an omnibar host mounts them: in their boundary, rendered with the host's props,
 * and their reports collected per provider.
 */
describe('with the cohort providers registered as shipped', () => {
  const mockOpenmrsFetch = vi.mocked(openmrsFetch);
  const providers = Object.entries(providerModules).map(
    ([name, [, Provider]]) => [name, withProviderBoundary(Provider, name)] as const,
  );

  beforeEach(() => {
    vi.mocked(useConfig<ConfigObject>).mockReturnValue(getDefaultsFromConfigSchema(configSchema) as ConfigObject);
    mockOpenmrsFetch.mockResolvedValue({ data: { results: [] } } as FetchResponse);
    vi.useFakeTimers();
  });

  afterEach(() => vi.useRealTimers());

  /** What every provider last reported for the query, as a host on contract 1 or an older one would mount them. */
  async function host(query: string, olderHost = false) {
    const reports = new Map<string, OmnibarReport>();
    const hostProps = olderHost ? {} : { hints: { looksLikeIdentifier: looksLikeIdentifier(query) } };
    render(
      <>
        {providers.map(([name, Provider]) => (
          <Provider
            key={name}
            query={query}
            context={{ scope: 'global', locale: 'en', ...(!olderHost && { workspaceGroup: null }) }}
            report={(report) => reports.set(name, report)}
            {...hostProps}
            {...(!olderHost && { contractVersion: OMNIBAR_CONTRACT_VERSION })}
          />
        ))}
      </>,
    );
    await act(async () => {
      vi.advanceTimersByTime(savedSearchDelayMs);
    });
    const rows = [...reports.values()].flatMap((report) => report.results ?? []);
    return { reports, rows };
  }

  it.each([
    ['100GEJ', false],
    ['4861TU-4', false],
    ['100GEJ', true],
    ['MRN-1234', true],
  ])(
    'offers no cohort row and asks nothing for the id %j (older host: %s), so the patient ranks first',
    async (id, olderHost) => {
      const { reports, rows } = await host(id, olderHost);
      expect([...reports.keys()].sort()).toEqual([...providerExtensions].sort());
      expect([...reports.values()].map((report) => [report.query, report.status])).toEqual(
        providerExtensions.map(() => [id, 'idle']),
      );
      expect(rows).toEqual([]);
      expect(mockOpenmrsFetch).not.toHaveBeenCalled();
    },
  );

  it('offers only the Cohort Builder row for "cohort"', async () => {
    const { rows } = await host('cohort');
    expect(rows).toEqual([
      expect.objectContaining({
        title: 'Cohort Builder',
        target: { type: 'navigate', to: '${openmrsSpaBase}/cohort-builder' },
      }),
    ]);
  });

  it.each(['co', 'coh', 'coho'])('leaves %j to patient search, which may find a patient like Cohen', async (query) => {
    const { rows } = await host(query);
    expect(rows).toEqual([]);
  });

  it('offers exactly one navigate row for cohort text, counting, with nothing fetched for it yet', async () => {
    const { reports, rows } = await host('women aged 15-49');
    expect(rows).toEqual([
      expect.objectContaining({
        title: 'Counting…',
        subtitle: 'Female Patients with ages between 15 and 49 years that are alive',
        target: { type: 'navigate', to: expect.stringMatching(/^\$\{openmrsSpaBase\}\/cohort-builder\?definition=/) },
      }),
    ]);
    expect(reports.get('omnibar-cohort-count-provider').status).toBe('loading');
    expect(mockOpenmrsFetch.mock.calls.map(([url]) => String(url)).filter((url) => url.includes('adhocquery'))).toEqual(
      [],
    );
  });

  it('reports an error instead of breaking the bar when a provider throws', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(useConfig<ConfigObject>).mockImplementation(() => {
      throw new Error('broken config');
    });
    const { reports } = await host('cohort');
    expect([...reports.values()].map(({ status, title }) => [status, title])).toEqual(
      providerExtensions.map(() => ['error', 'Results']),
    );
    expect(error).toHaveBeenCalledWith('Omnibar provider omnibar-cohort-count-provider failed with Error');
    error.mockRestore();
  });
});
