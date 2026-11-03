import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getDescription, getQueryDetails, type ConceptSearch } from './search-by-concepts.utils';

const viralLoad = {
  uuid: '856AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
  name: 'HIV viral load',
  hl7Abbrev: 'NM',
  units: 'copies/mL',
};
const hivTest = { uuid: '1040AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', name: 'HIV rapid test', hl7Abbrev: 'CWE', units: '' };

const search = (overrides: Partial<ConceptSearch> = {}): ConceptSearch => ({
  concept: viralLoad,
  timeModifier: 'LAST',
  operator: 'GREATER_THAN',
  value: 1000,
  ...overrides,
});

describe('the Concepts tab search', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-19T15:30:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('searches a numeric result with its comparison', () => {
    const { query } = getQueryDetails(search());
    expect(query.rowFilters).toEqual([
      {
        key: 'reporting.library.cohortDefinition.builtIn.numericObsSearchAdvanced',
        parameterValues: { timeModifier: 'LAST', question: viralLoad.uuid, operator1: 'GREATER_THAN', value1: '1000' },
        type: 'org.openmrs.module.reporting.dataset.definition.PatientDataSetDefinition',
      },
    ]);
    expect(query.customRowFilterCombination).toBe('1');
  });

  it('says what it searched, the comparison and the units included', () => {
    expect(getDescription(search())).toBe('Patients with most recent HIV viral load > 1000 copies/mL');
    expect(getDescription(search({ timeModifier: 'ANY', operator: 'LESS_EQUAL', value: 49.5 }))).toBe(
      'Patients with any HIV viral load <= 49.5 copies/mL',
    );
    expect(getDescription(search({ timeModifier: 'MIN', operator: 'LESS_THAN', value: 200 }))).toBe(
      'Patients with lowest HIV viral load < 200 copies/mL',
    );
    expect(getDescription(search({ concept: { ...viralLoad, units: '' } }))).toBe(
      'Patients with most recent HIV viral load > 1000',
    );
  });

  it.each([
    ['ANY', 'any'],
    ['NO', 'no'],
    ['FIRST', 'earliest'],
    ['LAST', 'most recent'],
    ['MIN', 'lowest'],
    ['MAX', 'highest'],
    ['AVG', 'average'],
  ])('names the %s result as %j', (timeModifier, words) => {
    expect(getDescription(search({ timeModifier, value: undefined }))).toBe(`Patients with ${words} HIV viral load`);
  });

  it('searches "within the last" months and days from that day on, not until it', () => {
    const { query } = getQueryDetails(search({ withinLastMonths: 4, withinLastDays: 15 }));
    expect(query.rowFilters[0].parameterValues).toEqual(
      expect.objectContaining({ onOrAfter: '2026-06-04T15:30:00+00:00' }),
    );
    expect(query.rowFilters[0].parameterValues).not.toHaveProperty('onOrBefore');
    expect(getDescription(search({ withinLastMonths: 4, withinLastDays: 15 }))).toBe(
      'Patients with most recent HIV viral load > 1000 copies/mL since 4/6/2026',
    );
  });

  it('keeps chosen dates, and "within the last" wins over a chosen start', () => {
    const dated = search({ onOrAfter: '2026-01-01T00:00:00+00:00', onOrBefore: '2026-06-30T00:00:00+00:00' });
    expect(getQueryDetails(dated).query.rowFilters[0].parameterValues).toEqual(
      expect.objectContaining({ onOrAfter: '2026-01-01T00:00:00+00:00', onOrBefore: '2026-06-30T00:00:00+00:00' }),
    );
    expect(getDescription(dated)).toBe(
      'Patients with most recent HIV viral load > 1000 copies/mL since 1/1/2026 until 30/6/2026',
    );
    expect(getQueryDetails({ ...dated, withinLastMonths: 1 }).query.rowFilters[0].parameterValues).toEqual(
      expect.objectContaining({ onOrAfter: '2026-09-19T15:30:00+00:00' }),
    );
  });

  it('searches a value of 0, which the form leaves out but a link may give', () => {
    expect(getQueryDetails(search({ value: 0 })).query.rowFilters[0].parameterValues).toEqual(
      expect.objectContaining({ operator1: 'GREATER_THAN', value1: '0' }),
    );
  });

  it('leaves out the comparison without a value', () => {
    expect(getQueryDetails(search({ value: undefined })).query.rowFilters[0].parameterValues).toEqual({
      timeModifier: 'LAST',
      question: viralLoad.uuid,
    });
  });

  it('searches a coded concept by presence, with no comparison', () => {
    const coded = search({ concept: hivTest, timeModifier: 'ANY' });
    expect(getQueryDetails(coded).query.rowFilters).toEqual([
      expect.objectContaining({
        key: 'reporting.library.cohortDefinition.builtIn.codedObsSearchAdvanced',
        parameterValues: { timeModifier: 'ANY', question: hivTest.uuid },
      }),
    ]);
    expect(getDescription(coded)).toBe('Patients with any HIV rapid test');
  });
});
