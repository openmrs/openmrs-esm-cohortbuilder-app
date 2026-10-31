import { describe, it, expect, beforeEach } from 'vitest';
import { createCompositionQuery, isCompositionValid } from './composition.utils';

const rowFilter = (key: string) => ({
  type: 'org.openmrs.module.reporting.dataset.definition.PatientDataSetDefinition',
  key: `reporting.library.cohortDefinition.builtIn.${key}`,
});

const setHistory = (items: Array<{ rowFilters: unknown[]; customRowFilterCombination: string }>) => {
  window.sessionStorage.setItem('openmrsHistory', JSON.stringify(items.map((parameters) => ({ parameters }))));
};

describe('isCompositionValid', () => {
  it.each([
    '(1 OR 2) AND 3',
    '( 1 OR 2 ) AND 3',
    '((1 OR 2) AND 3)',
    '(( 1 OR 2 ) AND 3 )',
    '(1)OR(2)',
    '1 and 2',
    '1 UNION 2',
    '1 intersection 2',
    '1 AND NOT 2',
    '1 + 2',
    '1 AND ! 2',
    '10 OR 11',
    '  (1\tOR\t2)\nAND 3  ',
  ])('accepts supported composition tokens in %j', (composition) => {
    expect(isCompositionValid(composition)).toBe(true);
  });

  it.each(['', '   ', '1 XOR 2', '1 AND 2abc', '(1 OR 2) AND 3?', '1and2'])(
    'rejects invalid composition tokens in %j',
    (composition) => {
      expect(isCompositionValid(composition)).toBe(false);
    },
  );
});

describe('createCompositionQuery', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it.each([
    ['(2 OR 3) AND 1', '( 2 OR 3 ) AND 1', '((1)OR(2))AND(3)'],
    ['((2 OR 3) AND 1)', '( ( 2 OR 3 ) AND 1 )', '(((1)OR(2))AND(3))'],
  ])('preserves grouping in %j regardless of spaces around parentheses', (compact, spaced, expected) => {
    const filters = [rowFilter('males'), rowFilter('females'), rowFilter('ageRangeOnDate')];
    setHistory(filters.map((filter) => ({ rowFilters: [filter], customRowFilterCombination: '1' })));

    const { query } = createCompositionQuery(compact);

    expect(query).toEqual(createCompositionQuery(spaced).query);
    expect(query.rowFilters).toEqual([filters[1], filters[2], filters[0]]);
    expect(query.customRowFilterCombination.replace(/\s/g, '')).toBe(expected);
  });

  it('renumbers every filter of a history item by the number of filters already in the query', () => {
    setHistory([
      { rowFilters: [rowFilter('males')], customRowFilterCombination: '1' },
      {
        rowFilters: [rowFilter('ageRangeOnDate'), rowFilter('diedDuringPeriod'), rowFilter('encounterSearchAdvanced')],
        customRowFilterCombination: '1 AND 2 AND NOT 3',
      },
    ]);

    const { query } = createCompositionQuery('1 AND 2');

    expect(query.rowFilters).toHaveLength(4);
    expect(query.customRowFilterCombination).toBe('(1) AND (2 AND 3 AND NOT 4)');
  });

  it('renumbers multi-digit filter numbers', () => {
    setHistory([
      {
        rowFilters: Array.from({ length: 10 }, (_, i) => rowFilter(`filter${i + 1}`)),
        customRowFilterCombination: '1 AND 10',
      },
      { rowFilters: [rowFilter('males'), rowFilter('females')], customRowFilterCombination: '1 OR 2' },
    ]);

    const { query } = createCompositionQuery('1 AND 2');

    expect(query.rowFilters).toHaveLength(12);
    expect(query.customRowFilterCombination).toBe('(1 AND 10) AND (11 OR 12)');
  });
});
