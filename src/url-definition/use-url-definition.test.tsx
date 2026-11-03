import React, { StrictMode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import { getDefaultsFromConfigSchema, openmrsFetch, showSnackbar, useConfig } from '@openmrs/esm-framework';
import { type ConfigObject, configSchema } from '../config-schema';
import type { Query } from '../types';
import CohortBuilder from '../cohort-builder.component';
import { addToHistory } from '../cohort-builder.utils';

const programUuid = '64f950e6-1b07-4ac0-8e7e-f3e148f3463f';
const drugUuid = '3cfcf118-931c-46f7-8ff6-7b876f0d4202';
const cohortUuid = 'f4c0b5a2-3c84-4c76-bb7e-6c1b1b2e5a11';
const queryUuid = '0d1b7a4e-6f3c-4b3a-9c3e-2a6f5a8b9c10';
const patientUuid = '8673ee4f-e2ab-4077-ba55-4980f408773e';
const missingUuid = '11111111-2222-4333-8444-555555555555';
const encounterTypeUuid = 'e22e39fd-7db2-45e7-80f1-60fa0d5a4378';

// The search tabs are not involved in opening a link and are slow to render.
vi.mock('../components/search-by-concepts/search-by-concepts.component', () => ({ default: () => null }));
vi.mock('../components/search-by-demographics/search-by-demographics.component', () => ({ default: () => null }));
vi.mock('../components/search-by-person-attributes/search-by-person-attributes.component', () => ({
  default: () => null,
}));
vi.mock('../components/search-by-encounters/search-by-encounters.component', () => ({ default: () => null }));
vi.mock('../components/search-by-location/search-by-location.component', () => ({ default: () => null }));
vi.mock('../components/search-by-enrollments/search-by-enrollments.component', () => ({ default: () => null }));
vi.mock('../components/search-by-drug-orders/search-by-drug-orders.component', () => ({ default: () => null }));
vi.mock('../components/composition/composition.component', () => ({ default: () => null }));
vi.mock('../components/saved-cohorts/saved-cohorts.component', () => ({ default: () => null }));
vi.mock('../components/saved-queries/saved-queries.component', () => ({ default: () => null }));

// The react-i18next mock returns default texts without interpolating them.
const mockOpenmrsFetch = vi.mocked(openmrsFetch);
const mockUseConfig = vi.mocked(useConfig<ConfigObject>);

const definition = {
  v: 1,
  label: 'Women 15-49 in HIV care on ARVs',
  criteria: [
    { type: 'demographics', gender: 'female', minAge: 15, maxAge: 49 },
    { type: 'enrollment', programs: [programUuid] },
    { type: 'drugOrder', drugs: [drugUuid], activeOnOrAfter: 'today' },
  ],
};

const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');

const row = (patientId: number) => ({
  patientId,
  firstname: 'Jane',
  lastname: `Doe ${patientId}`,
  age: 30,
  gender: 'F',
});

let adHocQueryResults: Array<ReturnType<typeof row>[] | Error>;
// Runs before an ad hoc query answers, e.g. to add a search made meanwhile from a tab.
let beforeAdHocQueryAnswers: (call: number) => void | Promise<void>;

function mockServer() {
  let adHocQueryCalls = 0;
  mockOpenmrsFetch.mockImplementation(async (url: string) => {
    if (url.includes(missingUuid)) {
      throw new Error("Object with given uuid doesn't exist");
    }
    if (url.includes('/reportingrest/adhocquery')) {
      await beforeAdHocQueryAnswers(adHocQueryCalls);
      const result = adHocQueryResults[adHocQueryCalls++] ?? [];
      if (result instanceof Error) {
        throw result;
      }
      return { data: { rows: result } } as never;
    }
    if (url.includes(`/program/${programUuid}`)) {
      return { data: { display: 'HIV Care and Treatment' } } as never;
    }
    if (url.includes(`/encountertype/${encounterTypeUuid}`)) {
      return { data: { display: 'Adult Visit' } } as never;
    }
    if (url.includes(`/drug/${drugUuid}`)) {
      throw new Error('Not found');
    }
    if (url.includes(`/cohort/${cohortUuid}/membership`)) {
      return { data: { results: [{ patientUuid, endDate: null, voided: false }] } } as never;
    }
    if (url.includes(`/patient/${patientUuid}`)) {
      const preferredName = { givenName: 'Amina', familyName: 'Otieno' };
      return { data: { patientId: 7, person: { gender: 'F', age: 32, preferredName } } } as never;
    }
    if (url.includes(`/reportingrest/dataSet/${queryUuid}`)) {
      return { data: { rows: [row(9)] } } as never;
    }
    return { data: { results: [] } } as never;
  });
}

const adHocQueryBodies = () =>
  mockOpenmrsFetch.mock.calls
    .filter(([url]) => url.includes('/reportingrest/adhocquery'))
    .map(([, init]) => JSON.parse(JSON.stringify(init.body)) as Query);

const history = () => JSON.parse(window.sessionStorage.getItem('openmrsHistory')) ?? [];

// What single-spa's navigateToUrl does when a link to the page that is already shown is opened.
function openLinkWhileShown(search: string) {
  act(() => {
    window.history.pushState(null, '', `/openmrs/spa/cohort-builder${search}`);
    window.dispatchEvent(new PopStateEvent('popstate'));
  });
}

function openBuilderAt(search: string) {
  window.history.replaceState(null, '', `/openmrs/spa/cohort-builder${search}`);
  render(
    <StrictMode>
      <CohortBuilder />
    </StrictMode>,
  );
}

describe('useUrlDefinition', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-17T15:30:00Z'));
    window.sessionStorage.clear();
    mockUseConfig.mockReturnValue(getDefaultsFromConfigSchema(configSchema));
    adHocQueryResults = [[row(1), row(2), row(3)], [row(2), row(3)], [row(3), row(4)], [row(3)]];
    beforeAdHocQueryAnswers = () => {};
    mockServer();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('runs each criterion, then ANDs them, once', async () => {
    openBuilderAt(`?definition=${encode(definition)}&tab=1`);

    await waitFor(() => expect(history()).toHaveLength(4));
    expect(history().map(({ description }) => description)).toEqual([
      'Female Patients with ages between 15 and 49 years that are alive',
      'Patients enrolled in HIV Care and Treatment',
      // formatDate is the framework mock's.
      'Patients who taking 1 drug on or after Today, 12:00 AM',
      // The builder's own words for each criterion, never the link's label.
      'Female Patients with ages between 15 and 49 years that are alive AND Patients enrolled in HIV Care and Treatment AND Patients who taking 1 drug on or after Today, 12:00 AM',
    ]);
    expect(history().map(({ patients }) => patients.length)).toEqual([3, 2, 2, 1]);

    const [demographics, enrollment, drugOrder, composition] = adHocQueryBodies();
    expect(adHocQueryBodies()).toHaveLength(4);
    expect(demographics).toMatchSnapshot('demographics');
    expect(enrollment).toMatchSnapshot('enrollment');
    expect(drugOrder).toMatchSnapshot('drugOrder');
    expect(composition.rowFilters).toEqual([
      ...demographics.rowFilters,
      ...enrollment.rowFilters,
      ...drugOrder.rowFilters,
    ]);
    expect(composition.customRowFilterCombination).toBe('(1 AND 2 AND NOT 3) AND (4) AND (5)');

    expect(window.location.search).toBe('?tab=1');
    expect(await screen.findByText('Jane Doe 3')).toBeInTheDocument();
  });

  it('searches encounter types, named from the server', async () => {
    openBuilderAt(
      `?definition=${encode({ v: 1, criteria: [{ type: 'encounter', encounterTypes: [encounterTypeUuid] }] })}`,
    );

    await waitFor(() => expect(history()).toHaveLength(1));
    expect(history()[0].description).toBe('Patients with Encounter of Types Adult Visit');
    expect(mockOpenmrsFetch).toHaveBeenCalledWith(
      expect.stringMatching(new RegExp(`/encountertype/${encounterTypeUuid}\\?v=custom:\\(display\\)$`)),
    );
    expect(adHocQueryBodies()[0].rowFilters).toEqual([
      expect.objectContaining({
        key: 'reporting.library.cohortDefinition.builtIn.encounterSearchAdvanced',
        parameterValues: { encounterTypeList: [encounterTypeUuid] },
      }),
    ]);
  });

  it('composes only its own entries when a search from a tab lands in between', async () => {
    beforeAdHocQueryAnswers = (call) => {
      if (call === 1) {
        addToHistory('Manual search', [], { rowFilters: [], customRowFilterCombination: '' } as Query);
      }
    };
    openBuilderAt(`?definition=${encode({ v: 1, criteria: definition.criteria.slice(0, 2) })}`);

    await waitFor(() => expect(history()).toHaveLength(4));
    expect(history().map(({ description }) => description)).toEqual([
      'Female Patients with ages between 15 and 49 years that are alive',
      'Manual search',
      'Patients enrolled in HIV Care and Treatment',
      'Female Patients with ages between 15 and 49 years that are alive AND Patients enrolled in HIV Care and Treatment',
    ]);
  });

  it('removes only its own entries when a search fails', async () => {
    beforeAdHocQueryAnswers = (call) => {
      if (call === 1) {
        addToHistory('Manual search', [], { rowFilters: [], customRowFilterCombination: '' } as Query);
      }
    };
    adHocQueryResults = [[row(1)], [row(1)], new Error('Internal Server Error')];
    openBuilderAt(`?definition=${encode(definition)}`);

    expect(await screen.findByText('This cohort builder link could not be opened')).toBeInTheDocument();
    expect(history().map(({ description }) => description)).toEqual(['Manual search']);
  });

  it('composes with the newest history entries when history already has searches', async () => {
    window.sessionStorage.setItem(
      'openmrsHistory',
      JSON.stringify([
        { description: 'Earlier search', patients: [], parameters: { rowFilters: [], customRowFilterCombination: '' } },
      ]),
    );
    const twoCriteria = { v: 1, criteria: definition.criteria.slice(0, 2) };
    openBuilderAt(`?definition=${encode(twoCriteria)}`);

    await waitFor(() => expect(history()).toHaveLength(4));
    expect(history()[3].description).toBe(
      'Female Patients with ages between 15 and 49 years that are alive AND Patients enrolled in HIV Care and Treatment',
    );
    expect(adHocQueryBodies()[2].customRowFilterCombination).toBe('(1 AND 2 AND NOT 3) AND (4)');
  });

  it("describes a single criterion in the builder's words, whatever the label says, and does not compose", async () => {
    openBuilderAt(
      `?definition=${encode({ v: 1, label: 'HIV patients', criteria: [{ type: 'demographics', minAge: 18 }] })}`,
    );

    await waitFor(() => expect(history()).toHaveLength(1));
    expect(history()[0].description).toBe('All Patients with minimum age of 18 years that are alive');
    expect(adHocQueryBodies()).toHaveLength(1);
    expect(await screen.findByText('All Patients with minimum age of 18 years that are alive')).toBeInTheDocument();
    expect(screen.queryByText('HIV patients')).not.toBeInTheDocument();
  });

  it('keeps the history as it was and shows why when a search fails', async () => {
    const earlierHistory = [{ description: 'Earlier search', patients: [row(8)], parameters: {} }];
    window.sessionStorage.setItem('openmrsHistory', JSON.stringify(earlierHistory));
    // Stock reporting has no builtIn.drugOrderSearch definition, so the drug order search fails.
    adHocQueryResults = [[row(1)], [row(1)], new Error('Internal Server Error')];
    openBuilderAt(`?definition=${encode(definition)}`);

    expect(await screen.findByText('This cohort builder link could not be opened')).toBeInTheDocument();
    expect(
      screen.getByText('The search "{{description}}" failed, so none of this link\'s searches were kept'),
    ).toBeInTheDocument();
    expect(showSnackbar).toHaveBeenCalledWith(expect.objectContaining({ subtitle: 'Internal Server Error' }));
    expect(adHocQueryBodies()).toHaveLength(3);
    expect(history()).toEqual(earlierHistory);
    await waitFor(() =>
      expect(screen.queryByText('Patients enrolled in HIV Care and Treatment')).not.toBeInTheDocument(),
    );
    expect(screen.getByText('Earlier search')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Drug Order' })).toBeEnabled();
  });

  it('uses the configured drug order search definition key', async () => {
    mockUseConfig.mockReturnValue({
      ...(getDefaultsFromConfigSchema(configSchema) as ConfigObject),
      drugOrderSearchDefinitionKey: 'configuration.definitionlibrary.cohort.drugOrderSearch',
    });
    openBuilderAt(`?definition=${encode({ v: 1, criteria: [definition.criteria[2]] })}`);

    await waitFor(() => expect(history()).toHaveLength(1));
    expect(adHocQueryBodies()[0].rowFilters.map(({ key }) => key)).toEqual([
      'configuration.definitionlibrary.cohort.drugOrderSearch',
    ]);
  });

  it.each([
    ['not base64url', 'definition=%%%'],
    ['an unknown key', `definition=${encode({ ...definition, sql: 'drop table' })}`],
    ['an unknown key that reads as advice', `definition=${encode({ ...definition, 'Call 555-0100 to verify': 1 })}`],
    ['an unknown criterion type', `definition=${encode({ v: 1, criteria: [{ type: 'concept', concept: 'x' }] })}`],
    ['too large', `definition=${'A'.repeat(6000)}`],
    ['a cohort that is not a uuid', 'cohort=..%2F..%2Fuser'],
  ])('shows one plain message, runs nothing and clears the URL when it is %s', async (_, search) => {
    openBuilderAt(`?${search}`);

    expect(await screen.findByText('This cohort builder link could not be opened')).toBeInTheDocument();
    expect(screen.getByText("This link isn't a valid cohort query")).toBeInTheDocument();
    // The reason is never shown: it can quote the link, and anyone can write a link.
    expect(screen.queryByText(/Definition|Criterion|uuid|555/)).not.toBeInTheDocument();
    expect(window.location.search).toBe('');
    expect(adHocQueryBodies()).toHaveLength(0);
    expect(
      mockOpenmrsFetch.mock.calls.some(([url]) => /\/(cohort|patient|program|drug)\/|adhocquery|dataSet\//.test(url)),
    ).toBe(false);
    expect(history()).toHaveLength(0);
  });

  it('shows the members of a saved cohort', async () => {
    openBuilderAt(`?cohort=${cohortUuid}`);

    expect(await screen.findByText('Amina Otieno')).toBeInTheDocument();
    expect(mockOpenmrsFetch).toHaveBeenCalledWith(expect.stringContaining(`/cohort/${cohortUuid}/membership?`));
    expect(mockOpenmrsFetch.mock.calls.filter(([url]) => url.includes('/membership'))).toHaveLength(1);
    expect(window.location.search).toBe('');
  });

  it.each([
    ['cohort', 'The saved cohort could not be loaded'],
    ['query', 'The saved query could not be run'],
  ])('shows an error when the saved %s cannot be loaded', async (name, message) => {
    openBuilderAt(`?${name}=${missingUuid}`);

    expect(await screen.findByText('This cohort builder link could not be opened')).toBeInTheDocument();
    expect(screen.getByText(message)).toBeInTheDocument();
    expect(window.location.search).toBe('');
  });

  /** Opens a saved cohort link whose memberships are these patients, the missing one failing to load. */
  function openCohortOf(memberUuids: Array<string>) {
    const memberships = memberUuids.map((uuid) => ({
      uuid,
      patientUuid: uuid,
      startDate: null,
      endDate: null,
      voided: false,
    }));
    const answerAsServer = mockOpenmrsFetch.getMockImplementation();
    mockOpenmrsFetch.mockImplementation(async (url: string, init) =>
      url.includes('/membership') ? ({ data: { results: memberships } } as never) : answerAsServer(url, init),
    );
    openBuilderAt(`?cohort=${cohortUuid}`);
  }

  it('says so when none of the members can be shown', async () => {
    openCohortOf([missingUuid]);

    expect(await screen.findByText('The saved cohort could not be loaded')).toBeInTheDocument();
  });

  it('warns, as for any saved cohort, when only some of the members can be shown', async () => {
    openCohortOf([patientUuid, missingUuid]);

    await waitFor(() =>
      expect(showSnackbar).toHaveBeenCalledWith(
        expect.objectContaining({ kind: 'warning', title: "Some of the cohort's members could not be shown" }),
      ),
    );
  });

  it('says when a saved cohort has more members than are shown', async () => {
    const memberships = Array.from({ length: 201 }, (_, i) => ({
      uuid: `membership-${i}`,
      patientUuid,
      startDate: null,
      endDate: null,
      voided: false,
    }));
    const answerAsServer = mockOpenmrsFetch.getMockImplementation();
    mockOpenmrsFetch.mockImplementation(async (url: string, init) =>
      url.includes('/membership') ? ({ data: { results: memberships } } as never) : answerAsServer(url, init),
    );
    openBuilderAt(`?cohort=${cohortUuid}`);

    expect(await screen.findByText('Showing the first {{shown}} of {{total}} members')).toBeInTheDocument();
  });

  it('runs a saved query', async () => {
    openBuilderAt(`?query=${queryUuid}`);

    expect(await screen.findByText('Jane Doe 9')).toBeInTheDocument();
    expect(
      mockOpenmrsFetch.mock.calls.filter(([url]) => url.includes(`/reportingrest/dataSet/${queryUuid}`)),
    ).toHaveLength(1);
    expect(window.location.search).toBe('');
  });

  it('runs a link opened while the page is shown', async () => {
    openBuilderAt('?tab=1');
    await screen.findByText('Search History');

    openLinkWhileShown(
      `?definition=${encode({ v: 1, label: 'Adults', criteria: [{ type: 'demographics', minAge: 18 }] })}`,
    );

    await waitFor(() => expect(history()).toHaveLength(1));
    expect(history()[0].description).toBe('All Patients with minimum age of 18 years that are alive');
    expect(window.location.search).toBe('');
  });

  it('runs only the latest link opened while another is running, after it', async () => {
    let answerFirstSearch: () => void;
    beforeAdHocQueryAnswers = (call) =>
      call === 0 ? new Promise<void>((resolve) => (answerFirstSearch = resolve)) : undefined;
    const link = (minAge: number) => `?definition=${encode({ v: 1, criteria: [{ type: 'demographics', minAge }] })}`;
    openBuilderAt(link(18));
    await waitFor(() => expect(adHocQueryBodies()).toHaveLength(1));

    openLinkWhileShown(link(30));
    openLinkWhileShown(link(40));
    expect(window.location.search).toBe('');
    expect(adHocQueryBodies()).toHaveLength(1);

    answerFirstSearch();
    await waitFor(() => expect(history()).toHaveLength(2));
    expect(history().map(({ description }) => description)).toEqual([
      'All Patients with minimum age of 18 years that are alive',
      'All Patients with minimum age of 40 years that are alive',
    ]);
    expect(adHocQueryBodies()).toHaveLength(2);
  });

  it('does nothing without URL params', async () => {
    openBuilderAt('?tab=1');

    await screen.findByText('Search History');
    expect(adHocQueryBodies()).toHaveLength(0);
    expect(window.location.search).toBe('?tab=1');
    expect(screen.queryByText('This cohort builder link could not be opened')).not.toBeInTheDocument();
  });
});
