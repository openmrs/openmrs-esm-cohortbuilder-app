import React from 'react';
import { createRequire } from 'node:module';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import dayjs from 'dayjs';
import { openmrsFetch } from '@openmrs/esm-framework';
import SearchByConcepts from './search-by-concepts/search-by-concepts.component';
import SearchByDemographics from './search-by-demographics/search-by-demographics.component';
import SearchByDrugOrder from './search-by-drug-orders/search-by-drug-orders.component';
import SearchByEncounters from './search-by-encounters/search-by-encounters.component';
import SearchByEnrollments from './search-by-enrollments/search-by-enrollments.component';

// Carbon's CommonJS build looks flatpickr's locales up by name, but here it gets the module whose only key
// is `default`, so flatpickr never starts and the inputs stay empty. With "en" in place the real picker runs.
const flatpickrLocales = createRequire(import.meta.url)('flatpickr/dist/l10n/index');

const mockOpenmrsFetch = vi.mocked(openmrsFetch);

vi.mock('./search-by-concepts/search-concept/search-concept.resource', () => ({
  getConcepts: vi.fn().mockResolvedValue([
    {
      uuid: '2a08da66-f326-4cac-b4cc-6efd68333847',
      units: 'mg/dl',
      answers: [],
      hl7Abbrev: 'NM',
      name: 'BLOOD SUGAR',
      description: 'Laboratory measurement of the glucose level in the blood.',
      datatype: { uuid: '8d4a4488-c2cc-11de-8d13-0010c6dffd0f', name: 'Numeric', hl7Abbreviation: 'NM' },
    },
  ]),
}));

const drug = '3cfcf118-931c-46f7-8ff6-7b876f0d4202';

const dateInputs = () => screen.getAllByPlaceholderText('DD-MM-YYYY') as HTMLInputElement[];

const tabs = [
  ['concepts', SearchByConcepts, 2],
  ['demographics', SearchByDemographics, 2],
  ['encounters', SearchByEncounters, 2],
  ['enrollments', SearchByEnrollments, 4],
  ['drug orders', SearchByDrugOrder, 4],
] as const;

/** Gets a tab ready to search: the concepts tab searches only with a concept, the drug orders tab with a drug. */
async function prepare(Tab: (typeof tabs)[number][1]) {
  if (Tab === SearchByConcepts) {
    await userEvent.type(screen.getByPlaceholderText('Search Concepts'), 'blood sugar');
    // The concept search waits for typing to pause, which it measures with the clock this file holds still.
    vi.setSystemTime(Date.now() + 1000);
    await userEvent.click(await screen.findByText('BLOOD SUGAR'));
  }
  if (Tab === SearchByDrugOrder) {
    await userEvent.click(screen.getByText('Select drugs'));
    await userEvent.click(await screen.findByText('Aspirin'));
    await userEvent.keyboard('{Escape}');
  }
}

/** Presses Search and returns what the tab searched with. */
async function search(onSubmit: ReturnType<typeof vi.fn>) {
  await userEvent.click(screen.getByTestId('search-btn'));
  return onSubmit.mock.calls.at(-1);
}

/** Renders a tab, presses Search without touching anything, and returns what it searched with. */
async function untouchedSearch(Tab: (typeof tabs)[number][1]) {
  const onSubmit = vi.fn();
  const { unmount } = render(<Tab onSubmit={onSubmit} />);
  await prepare(Tab);
  const searched = await search(onSubmit);
  unmount();
  return searched;
}

/** Types into a picker the way a person does: clicking it, replacing its text and moving on. */
async function type(input: HTMLInputElement, text: string) {
  await userEvent.clear(input);
  await userEvent.type(input, text);
}

/** Picks a date the way a click in the calendar does: flatpickr sets it and reports the change. */
function pick(input: HTMLInputElement, date: Date) {
  act(() => {
    (
      input as HTMLInputElement & { _flatpickr: { setDate: (date: Date, triggerChange: boolean) => void } }
    )._flatpickr.setDate(date, true);
  });
}

describe('date pickers', () => {
  beforeAll(() => {
    flatpickrLocales.en = flatpickrLocales.default.en;
  });

  afterAll(() => {
    delete flatpickrLocales.en;
  });

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-17T15:30:00Z'));
    mockOpenmrsFetch.mockImplementation(
      async (url) =>
        ({ data: { results: url.endsWith('/drug') ? [{ uuid: drug, display: 'Aspirin' }] : [] } } as never),
    );
    return () => vi.useRealTimers();
  });

  it.each(tabs)('keep showing a picked date on the %s tab', async (_, Tab, pickers) => {
    render(<Tab onSubmit={vi.fn()} />);
    expect(dateInputs()).toHaveLength(pickers);

    for (const input of dateInputs()) {
      pick(input, new Date(2024, 11, 31));
      await waitFor(() => expect(input).toHaveValue('31-12-2024'));
    }
  });

  it('searches with the picked date', async () => {
    const onSubmit = vi.fn();
    render(<SearchByDemographics onSubmit={onSubmit} />);

    pick(dateInputs()[0], new Date(2024, 11, 31));
    pick(dateInputs()[1], new Date(2025, 0, 1));
    const [{ query }] = await search(onSubmit);

    expect(query.rowFilters.find(({ key }) => key.endsWith('bornDuringPeriod')).parameterValues).toEqual({
      startDate: dayjs(new Date(2024, 11, 31)).format(),
      endDate: dayjs(new Date(2025, 0, 1)).format(),
    });
  });

  it.each(tabs)('are all empty after Reset on the %s tab, and so is the search', async (_, Tab) => {
    const untouched = await untouchedSearch(Tab);
    const onSubmit = vi.fn();
    render(<Tab onSubmit={onSubmit} />);

    for (const input of dateInputs()) {
      pick(input, new Date(2024, 11, 31));
    }
    await userEvent.click(screen.getByTestId('reset-btn'));

    await waitFor(() => expect(dateInputs().every((input) => input.value === '')).toBe(true), { timeout: 1000 });
    await prepare(Tab);
    expect(await search(onSubmit)).toEqual(untouched);
  });

  it.each(tabs)('search with a typed date on the %s tab, as if it were picked', async (_, Tab) => {
    const dates = [new Date(2024, 1, 1), new Date(2024, 0, 2), new Date(2024, 1, 29), new Date(2024, 11, 31)];
    const typed = ['01-02-2024', '02-01-2024', '29-02-2024', '31-12-2024'];

    const pickedSubmit = vi.fn();
    const { unmount } = render(<Tab onSubmit={pickedSubmit} />);
    await prepare(Tab);
    dateInputs().forEach((input, index) => pick(input, dates[index]));
    const picked = await search(pickedSubmit);
    unmount();

    const typedSubmit = vi.fn();
    render(<Tab onSubmit={typedSubmit} />);
    await prepare(Tab);
    for (const [index, input] of dateInputs().entries()) {
      await type(input, typed[index]);
    }
    expect(await search(typedSubmit)).toEqual(picked);
    expect(dateInputs().map((input) => input.value)).toEqual(typed.slice(0, dateInputs().length));
  });

  it.each([
    ['1-02-2024', new Date(2024, 1, 1)],
    ['01-2-2024', new Date(2024, 1, 1)],
    ['1-2-2024', new Date(2024, 1, 1)],
    ['2-1-2024', new Date(2024, 0, 2)],
    ['31-02-2024', null],
    ['29-02-2023', null],
    ['2024-12-31', null],
    ['1-13-2024', null],
  ])('reads a typed %s strictly as day-month-year', async (text, date) => {
    const onSubmit = vi.fn();
    render(<SearchByEncounters onSubmit={onSubmit} />);

    await type(dateInputs()[0], text);
    const [{ query }] = await search(onSubmit);

    expect(dateInputs()[0]).toHaveValue(date ? dayjs(date).format('DD-MM-YYYY') : '');
    expect(query.rowFilters[0]?.parameterValues?.onOrAfter).toEqual(date ? dayjs(date).format() : undefined);
  });

  it('takes a typed date when Enter is pressed', async () => {
    const onSubmit = vi.fn();
    render(<SearchByDemographics onSubmit={onSubmit} />);

    await type(dateInputs()[0], '31-12-2024{Enter}');
    await type(dateInputs()[1], '01-01-2025{Enter}');

    await waitFor(() => expect(dateInputs().map((input) => input.value)).toEqual(['31-12-2024', '01-01-2025']), {
      timeout: 1000,
    });
    const [{ query }] = await search(onSubmit);
    expect(query.rowFilters.find(({ key }) => key.endsWith('bornDuringPeriod')).parameterValues).toEqual({
      startDate: dayjs(new Date(2024, 11, 31)).format(),
      endDate: dayjs(new Date(2025, 0, 1)).format(),
    });
  });

  it('searches with a typed date when Tab moves on from it', async () => {
    const onSubmit = vi.fn();
    render(<SearchByEncounters onSubmit={onSubmit} />);

    await type(dateInputs()[0], '31-12-2024');
    await userEvent.tab();
    const [{ query }] = await search(onSubmit);

    expect(query.rowFilters[0]?.parameterValues?.onOrAfter).toEqual(dayjs(new Date(2024, 11, 31)).format());
  });

  it('leaves a deleted date out of the search', async () => {
    const onSubmit = vi.fn();
    render(<SearchByEncounters onSubmit={onSubmit} />);

    pick(dateInputs()[0], new Date(2024, 11, 31));
    await userEvent.clear(dateInputs()[0]);
    const [{ query }] = await search(onSubmit);

    expect(dateInputs()[0]).toHaveValue('');
    expect(query.rowFilters[0]?.parameterValues?.onOrAfter).toBeUndefined();
  });

  it('takes a typed date when a touch outside closes the calendar', async () => {
    const onSubmit = vi.fn();
    render(<SearchByDemographics onSubmit={onSubmit} />);

    await type(dateInputs()[0], '31-12-2024');
    fireEvent.touchStart(document.body);
    await type(dateInputs()[1], '01-01-2025');
    fireEvent.touchStart(document.body);

    const [{ query }] = await search(onSubmit);
    expect(query.rowFilters.find(({ key }) => key.endsWith('bornDuringPeriod')).parameterValues).toEqual({
      startDate: dayjs(new Date(2024, 11, 31)).format(),
      endDate: dayjs(new Date(2025, 0, 1)).format(),
    });
  });

  it.each(tabs)('clear a date typed wrongly on the %s tab, and search without it', async (_, Tab) => {
    const untouched = await untouchedSearch(Tab);
    const onSubmit = vi.fn();
    render(<Tab onSubmit={onSubmit} />);
    await prepare(Tab);
    const wrong = ['31-02-2024', '12-2024', '2024-12-31', 'soon'];

    for (const [index, input] of dateInputs().entries()) {
      pick(input, new Date(2024, 11, 31));
      await type(input, wrong[index]);
    }

    expect(await search(onSubmit)).toEqual(untouched);
    expect(dateInputs().every((input) => input.value === '')).toBe(true);
  });
});
