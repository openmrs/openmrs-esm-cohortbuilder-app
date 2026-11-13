import { AsyncLocalStorage } from 'node:async_hooks';
import React, { StrictMode } from 'react';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it as vitestIt, vi } from 'vitest';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { getDefaultsFromConfigSchema, openmrsFetch, useConfig, useOpenmrsFetchAll } from '@openmrs/esm-framework';
import { type ConfigObject, configSchema } from '../config-schema';
import type { Query } from '../types';
import CohortBuilder from '../cohort-builder.component';
import { buildSearch, type CohortDefinition, type Criterion } from './url-definition';

const hivProgram = '64f950e6-1b07-4ac0-8e7e-f3e148f3463f';
const tbProgram = '9119b9f9-9a4b-4a4e-a4fb-9b4f0b0c6b11';
const tenofovir = '3cfcf118-931c-46f7-8ff6-7b876f0d4202';
const dolutegravir = '7e1c4b6a-2f7d-4c43-9e7e-1d3b5a0f9c21';
// Not in the drug list: only its own lookup knows its name.
const lamivudine = '5a1f8c3e-6b2d-4e7f-8a9b-0c1d2e3f4a51';
// Neither in the list nor found by its lookup.
const unknownDrug = '11111111-2222-4333-8444-555555555555';

// The tabs a definition can't fill are not involved and are slow to render.
vi.mock('../components/search-by-concepts/search-by-concepts.component', () => ({ default: () => null }));
vi.mock('../components/search-by-person-attributes/search-by-person-attributes.component', () => ({
  default: () => null,
}));
vi.mock('../components/search-by-encounters/search-by-encounters.component', () => ({ default: () => null }));
vi.mock('../components/search-by-location/search-by-location.component', () => ({ default: () => null }));
vi.mock('../components/composition/composition.component', () => ({ default: () => null }));
vi.mock('../components/saved-cohorts/saved-cohorts.component', () => ({ default: () => null }));
vi.mock('../components/saved-queries/saved-queries.component', () => ({ default: () => null }));
// Nothing here reads the results, the history table or the calendar. Mounting them builds two Carbon
// data tables and a flatpickr for every date (ten of them, and flatpickr throws "invalid locale undefined"
// in jsdom). On the CI runner that pushed every test up against the 5s limit. A test that then timed out
// kept running and changed the next test. The dates still go out with a search: each tab keeps them in its
// own state, which is what Search reads.
vi.mock('../components/search-results-table/search-results-table.component', () => ({ default: () => null }));
vi.mock('../components/search-history/search-history.component', () => ({ default: () => null }));
vi.mock('../components/search-date-picker/search-date-picker', () => ({ default: () => null }));

// Vitest aborts the test's signal at the timeout, then moves on, but the async function keeps going.
// Its later URL changes, history writes and tab clicks would land on the next test. The signal stays with
// this test's awaits, including the link run that started from the render.
const tests = new AsyncLocalStorage<AbortSignal>();

class FinishedTest extends Error {
  constructor() {
    super('Test already finished');
    this.name = 'FinishedTest';
  }
}

/** Runs `body` with this test's abort signal, so a timeout cannot act on the test that follows. */
function it(title: string, body: () => Promise<void>) {
  vitestIt(title, async (context) => {
    await tests.run(context.signal, body);
  });
}

function stopIfStale() {
  if (tests.getStore()?.aborted) {
    throw new FinishedTest();
  }
}

const historyPushState = window.history.pushState.bind(window.history);
const historyReplaceState = window.history.replaceState.bind(window.history);
const dispatchWindowEvent = window.dispatchEvent.bind(window);
const sessionSetItem = window.sessionStorage.setItem.bind(window.sessionStorage);
const sessionRemoveItem = window.sessionStorage.removeItem.bind(window.sessionStorage);

function staleHistoryWrite(): boolean {
  return tests.getStore()?.aborted === true;
}

beforeAll(() => {
  window.history.pushState = (data, unused, url) => {
    if (!staleHistoryWrite()) {
      historyPushState(data, unused, url);
    }
  };
  window.history.replaceState = (data, unused, url) => {
    if (!staleHistoryWrite()) {
      historyReplaceState(data, unused, url);
    }
  };
  window.dispatchEvent = (event: Event) => {
    if (event.type === 'popstate' && staleHistoryWrite()) {
      return true;
    }
    return dispatchWindowEvent(event);
  };
  window.sessionStorage.setItem = (key, value) => {
    if (!staleHistoryWrite()) {
      sessionSetItem(key, value);
    }
  };
  window.sessionStorage.removeItem = (key) => {
    if (!staleHistoryWrite()) {
      sessionRemoveItem(key);
    }
  };
});

afterAll(() => {
  window.history.pushState = historyPushState;
  window.history.replaceState = historyReplaceState;
  window.dispatchEvent = dispatchWindowEvent;
  window.sessionStorage.setItem = sessionSetItem;
  window.sessionStorage.removeItem = sessionRemoveItem;
});

const mockOpenmrsFetch = vi.mocked(openmrsFetch);
const mockUseConfig = vi.mocked(useConfig<ConfigObject>);
const mockUseOpenmrsFetchAll = vi.mocked(useOpenmrsFetchAll);

const women15to49: Criterion = { type: 'demographics', gender: 'female', minAge: 15, maxAge: 49 };
const onArvs: Criterion = { type: 'drugOrder', drugs: [tenofovir, dolutegravir, lamivudine], activeOnOrAfter: 'today' };
const inHivCare: Criterion = {
  type: 'enrollment',
  programs: [hivProgram, tbProgram],
  enrolledOnOrAfter: '2024-01-01',
  enrolledOnOrBefore: '2024-12-31',
};

const definitionLink = (definition: CohortDefinition) =>
  `?definition=${Buffer.from(JSON.stringify(definition)).toString('base64url')}`;
const link = (...criteria: Criterion[]) => definitionLink({ v: 1, criteria });

let adHocQueryFails: boolean;

function mockServer() {
  // The search tabs load their dropdown lists a page at a time.
  mockUseOpenmrsFetchAll.mockImplementation(
    (url) =>
      ({
        data: String(url).includes('/program?')
          ? [
              { uuid: hivProgram, name: 'HIV Care and Treatment' },
              { uuid: tbProgram, name: 'TB Program' },
            ]
          : String(url).includes('/drug?')
          ? [
              { uuid: tenofovir, display: 'Tenofovir' },
              { uuid: dolutegravir, display: 'Dolutegravir' },
            ]
          : [],
        isLoading: false,
      } as never),
  );
  mockOpenmrsFetch.mockImplementation(async (url: string) => {
    if (url.includes('/reportingrest/adhocquery')) {
      if (adHocQueryFails) {
        throw new Error('Internal Server Error');
      }
      return { data: { rows: [] } } as never;
    }
    if (url.includes('/program?')) {
      return {
        data: {
          results: [
            { uuid: hivProgram, name: 'HIV Care and Treatment' },
            { uuid: tbProgram, name: 'TB Program' },
          ],
        },
      } as never;
    }
    if (url.includes('/drug?')) {
      return {
        data: {
          results: [
            { uuid: tenofovir, display: 'Tenofovir' },
            { uuid: dolutegravir, display: 'Dolutegravir' },
          ],
        },
      } as never;
    }
    const names = {
      [hivProgram]: 'HIV Care and Treatment',
      [tbProgram]: 'TB Program',
      [tenofovir]: 'Tenofovir',
      [dolutegravir]: 'Dolutegravir',
      [lamivudine]: 'Lamivudine',
    };
    const lookup = Object.keys(names).find((uuid) => url.includes(`/${uuid}?`));
    if (lookup) {
      return { data: { display: names[lookup] } } as never;
    }
    if (url.includes(unknownDrug)) {
      throw new Error("Object with given uuid doesn't exist");
    }
    return { data: { results: [] } } as never;
  });
}

const adHocQueryBodies = () =>
  mockOpenmrsFetch.mock.calls
    .filter(([url]) => url.includes('/reportingrest/adhocquery'))
    .map(([, init]) => JSON.parse(JSON.stringify(init.body)) as Query);

const history = () => JSON.parse(window.sessionStorage.getItem('openmrsHistory')) ?? [];

/** What the link's own run sends for a criterion, as JSON goes over the wire. */
const searchFor = (criterion: Criterion) =>
  JSON.parse(JSON.stringify(buildSearch(criterion, new Map(), configSchemaDefaults().drugOrderSearchDefinitionKey)))
    .searchParams.query;

const configSchemaDefaults = () => getDefaultsFromConfigSchema(configSchema) as ConfigObject;

function openBuilderAt(search: string) {
  stopIfStale();
  window.history.replaceState(null, '', `/openmrs/spa/cohort-builder${search}`);
  render(
    <StrictMode>
      <CohortBuilder />
    </StrictMode>,
  );
}

// What single-spa's navigateToUrl does when a link to the page that is already shown is opened.
function openLinkWhileShown(search: string) {
  stopIfStale();
  act(() => {
    window.history.pushState(null, '', `/openmrs/spa/cohort-builder${search}`);
    window.dispatchEvent(new PopStateEvent('popstate'));
  });
}

const selectedTab = () =>
  within(screen.getByRole('tablist', { name: 'navigation' })).getByRole('tab', { selected: true });
// Only the selected tab's panel is shown; the others are hidden.
const panel = () => within(screen.getByRole('tabpanel'));

// delay: null skips the setTimeout(0) between each key and click. On a busy runner those timers
// wait behind everyone else, which is most of why a test that is under a second here crosses 5s in CI.
let user = userEvent.setup({ delay: null });

async function click(target: Element) {
  stopIfStale();
  await user.click(target);
}

async function typeInto(target: Element, text: string) {
  stopIfStale();
  await user.type(target, text);
}

async function clearField(target: Element) {
  stopIfStale();
  await user.clear(target);
}

async function showTab(name: string) {
  await click(screen.getByRole('tab', { name }));
}

/** Waits until `assertion` holds. A test that has already timed out stops here instead of polling the next one. */
async function until(assertion: () => void) {
  const signal = tests.getStore();
  await waitFor(() => {
    if (signal?.aborted) {
      return;
    }
    assertion();
  });
  if (signal?.aborted) {
    throw new FinishedTest();
  }
}

function expectDemographics(gender: string, minAge: number, maxAge: number) {
  expect(panel().getByTestId(gender)).toHaveAttribute('aria-selected', 'true');
  expect(panel().getByTestId('minAge')).toHaveValue(minAge);
  expect(panel().getByTestId('maxAge')).toHaveValue(maxAge);
}

/** The labels checked in the panel's dropdown with this placeholder, read by opening it once. */
async function selectedOptions(placeholder: string) {
  stopIfStale();
  await user.click(panel().getByText(placeholder));
  const labels = screen
    .getAllByRole('option')
    .filter((option) => option.getAttribute('aria-selected') === 'true')
    .map((option) => option.textContent)
    .sort();
  stopIfStale();
  await user.keyboard('{Escape}');
  return labels;
}

async function search() {
  stopIfStale();
  const searches = adHocQueryBodies().length;
  await user.click(panel().getByTestId('search-btn'));
  await until(() => expect(adHocQueryBodies()).toHaveLength(searches + 1));
  return adHocQueryBodies()[searches];
}

describe('pre-filling the search tabs from a definition link', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-17T15:30:00Z'));
    window.sessionStorage.clear();
    window.history.replaceState(null, '', '/openmrs/spa/cohort-builder');
    user = userEvent.setup({ delay: null });
    mockUseConfig.mockReturnValue(configSchemaDefaults());
    adHocQueryFails = false;
    mockServer();
  });

  afterEach(() => {
    window.sessionStorage.clear();
    window.history.replaceState(null, '', '/openmrs/spa/cohort-builder');
    vi.useRealTimers();
  });

  it('fills in and shows the demographics tab for women aged 15-49', async () => {
    openBuilderAt(definitionLink({ v: 1, label: 'Female patients aged 15–49', criteria: [women15to49] }));

    await until(() => expect(selectedTab()).toHaveTextContent('Demographics'));
    expectDemographics('Female', 15, 49);
  });

  it('fills in and shows the drug order tab for patients on ARVs', async () => {
    openBuilderAt(definitionLink({ v: 1, label: 'Patients on ARVs', criteria: [onArvs] }));

    await until(() => expect(selectedTab()).toHaveTextContent('Drug Order'));
    // Lamivudine isn't in the drug list, so it is shown with the name its own lookup found.
    expect(await selectedOptions('Select drugs')).toEqual(['Dolutegravir', 'Lamivudine', 'Tenofovir']);
  });

  it('shows the uuid of a drug that has no name anywhere', async () => {
    openBuilderAt(link({ type: 'drugOrder', drugs: [tenofovir, unknownDrug] }));

    await until(() => expect(selectedTab()).toHaveTextContent('Drug Order'));
    expect(await selectedOptions('Select drugs')).toEqual([unknownDrug, 'Tenofovir']);
  });

  it('fills in the drug order tab when drug criteria are switched off for the omnibar', async () => {
    mockUseConfig.mockReturnValue({ ...configSchemaDefaults(), drugCriteriaEnabled: false });
    openBuilderAt(link(onArvs));

    await until(() => expect(selectedTab()).toHaveTextContent('Drug Order'));
    expect(await selectedOptions('Select drugs')).toEqual(['Dolutegravir', 'Lamivudine', 'Tenofovir']);
  });

  it('fills in and shows the enrollments tab', async () => {
    openBuilderAt(link(inHivCare));

    await until(() => expect(selectedTab()).toHaveTextContent('Enrollments'));
    expect(await selectedOptions('Select programs')).toEqual(['HIV Care and Treatment', 'TB Program']);
  });

  it("fills in every criterion's tab and shows the first one's", async () => {
    const inTbCare: Criterion = { type: 'enrollment', programs: [tbProgram] };
    openBuilderAt(link(women15to49, { type: 'enrollment', programs: [hivProgram] }, inTbCare, onArvs));

    await until(() => expect(selectedTab()).toHaveTextContent('Demographics'));
    expectDemographics('Female', 15, 49);

    // A type that repeats fills its tab with its first criterion.
    await showTab('Enrollments');
    expect(await selectedOptions('Select programs')).toEqual(['HIV Care and Treatment']);

    await showTab('Drug Order');
    expect(await selectedOptions('Select drugs')).toEqual(['Dolutegravir', 'Lamivudine', 'Tenofovir']);
  });

  it('shows all genders and no upper bound for a minimum age alone', async () => {
    openBuilderAt(link({ type: 'demographics', gender: 'any', minAge: 18 }));

    await until(() => expect(selectedTab()).toHaveTextContent('Demographics'));
    expectDemographics('All', 18, 0);
  });

  it("fills in the tabs even when the link's search fails, so it can be fixed and run again", async () => {
    adHocQueryFails = true;
    openBuilderAt(link(women15to49));

    await until(() => expect(screen.getByText('This cohort builder link could not be opened')).toBeInTheDocument());
    expect(selectedTab()).toHaveTextContent('Demographics');
    expectDemographics('Female', 15, 49);
  });

  it('fills in nothing for a link that cannot be read', async () => {
    openBuilderAt('?definition=%%%');

    await until(() => expect(screen.getByText('This cohort builder link could not be opened')).toBeInTheDocument());
    expect(selectedTab()).toHaveTextContent('Concepts');
    await showTab('Demographics');
    expectDemographics('All', 0, 0);
  });

  // The date pickers are not mounted. A search still sends the link's dates, because the tab keeps them.
  for (const [name, criterion] of [
    ['demographics', women15to49],
    ['enrollment', inHivCare],
    ['drugOrder', onArvs],
  ] as const) {
    it(`searches for exactly what the link did when ${name} is searched without edits`, async () => {
      openBuilderAt(link(criterion));
      await until(() => expect(history()).toHaveLength(1));

      const [linkSearch] = adHocQueryBodies();
      expect(linkSearch).toEqual(searchFor(criterion));
      expect(await search()).toEqual(linkSearch);
    });
  }

  it('changes only the edited field', async () => {
    openBuilderAt(link(women15to49));
    await until(() => expect(history()).toHaveLength(1));

    await clearField(panel().getByTestId('maxAge'));
    await typeInto(panel().getByTestId('maxAge'), '40');

    expect(await search()).toEqual(searchFor({ ...women15to49, maxAge: 40 }));
    // The search re-renders the page, which must not put the link's values back.
    await until(() => expect(history()).toHaveLength(2));
    expectDemographics('Female', 15, 40);
  });

  it('fills in the tabs again for a link opened while the page is shown', async () => {
    openBuilderAt(link(women15to49));
    await until(() => expect(history()).toHaveLength(1));
    await clearField(panel().getByTestId('maxAge'));
    await typeInto(panel().getByTestId('maxAge'), '40');

    openLinkWhileShown(link(onArvs));

    await until(() => expect(selectedTab()).toHaveTextContent('Drug Order'));
    expect(await selectedOptions('Select drugs')).toEqual(['Dolutegravir', 'Lamivudine', 'Tenofovir']);
    // The tabs show the new link, so one it doesn't fill is back to empty.
    await showTab('Demographics');
    expectDemographics('All', 0, 0);

    // The same link opened again is a new link too.
    openLinkWhileShown(link(women15to49));
    await until(() => expectDemographics('Female', 15, 49));
    await showTab('Concepts');
    openLinkWhileShown(link(women15to49));
    await until(() => expect(selectedTab()).toHaveTextContent('Demographics'));
  });

  it('keeps the tabs as they are when a link that cannot be read is opened while the page is shown', async () => {
    openBuilderAt(link(women15to49));
    await until(() => expect(history()).toHaveLength(1));

    openLinkWhileShown('?definition=%%%');

    await until(() => expect(screen.getByText('This cohort builder link could not be opened')).toBeInTheDocument());
    expect(selectedTab()).toHaveTextContent('Demographics');
    expectDemographics('Female', 15, 49);
  });

  it('clears the pre-filled ages and programs on reset', async () => {
    openBuilderAt(link(women15to49, inHivCare));
    await until(() => expect(history()).toHaveLength(3));

    await click(panel().getByRole('button', { name: 'Reset' }));
    expect(panel().getByTestId('minAge')).toHaveValue(0);
    expect(panel().getByTestId('maxAge')).toHaveValue(0);

    await showTab('Enrollments');
    await click(panel().getByRole('button', { name: 'Reset' }));
    expect(await selectedOptions('Select programs')).toEqual([]);
  });
});
