import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  buildSearch,
  decodeDefinition,
  encodeDefinition,
  isUuid,
  MAX_DEFINITION_BYTES,
  readUrlRequest,
  toQueryDate,
  validateDefinition,
  type CohortDefinition,
} from './url-definition';
import goldenFixtures from '../omnibar/golden-fixtures.json';

const programUuid = '64f950e6-1b07-4ac0-8e7e-f3e148f3463f';
const drugUuid = '3cfcf118-931c-46f7-8ff6-7b876f0d4202';
const otherDrugUuid = '5cfcf118-931c-46f7-8ff6-7b876f0d4203';
const cielStyleUuid = '1065AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
const encounterTypeUuid = 'e22e39fd-7db2-45e7-80f1-60fa0d5a4378';

const validDefinition = {
  v: 1,
  label: 'Female patients aged 15-49 on ARVs',
  criteria: [
    { type: 'demographics', gender: 'female', minAge: 15, maxAge: 49 },
    { type: 'enrollment', programs: [programUuid] },
    { type: 'drugOrder', drugs: [drugUuid, otherDrugUuid], activeOnOrAfter: 'today' },
  ],
};

const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');

describe('readUrlRequest', () => {
  it('returns null when the URL has none of the params', () => {
    expect(readUrlRequest(new URLSearchParams('foo=bar'))).toBeNull();
  });

  it('reads a definition', () => {
    expect(readUrlRequest(new URLSearchParams({ definition: encode(validDefinition) }))).toEqual({
      type: 'definition',
      definition: validDefinition,
    });
  });

  it.each(['cohort', 'query'])('reads a %s uuid', (name) => {
    expect(readUrlRequest(new URLSearchParams({ [name]: programUuid }))).toEqual({ type: name, uuid: programUuid });
  });

  it.each(['', 'not-a-uuid', '../../user/3cfcf118-931c-46f7-8ff6-7b876', `${programUuid}/x`, `${programUuid}?v=full`])(
    'rejects the cohort uuid "%s"',
    (cohort) => {
      expect(() => readUrlRequest(new URLSearchParams({ cohort }))).toThrow('"cohort" must be a uuid');
    },
  );

  it('prefers definition over cohort over query and warns about the ignored ones', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const request = readUrlRequest(
      new URLSearchParams({ query: programUuid, cohort: drugUuid, definition: encode(validDefinition) }),
    );
    expect(request.type).toBe('definition');
    expect(warn).toHaveBeenCalledWith('Cohort builder: using "definition" and ignoring "cohort", "query"');

    expect(readUrlRequest(new URLSearchParams({ query: programUuid, cohort: drugUuid }))).toEqual({
      type: 'cohort',
      uuid: drugUuid,
    });
    expect(warn).toHaveBeenLastCalledWith('Cohort builder: using "cohort" and ignoring "query"');
  });

  it('rejects an invalid definition even when a valid cohort is also given', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(() => readUrlRequest(new URLSearchParams({ definition: encode({ v: 2 }), cohort: programUuid }))).toThrow(
      '"v" must be 1',
    );
  });
});

describe('isUuid', () => {
  it.each([programUuid, programUuid.toUpperCase(), cielStyleUuid, '5089AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'])(
    'accepts %s',
    (value) => {
      expect(isUuid(value)).toBe(true);
    },
  );

  it.each([
    undefined,
    null,
    42,
    '',
    programUuid.slice(1),
    `${programUuid}a`,
    '64f950e6/1b07-4ac0-8e7e-f3e148f3463f',
    '64f950e6.1b07-4ac0-8e7e-f3e148f3463f',
    '64f950e6 1b07-4ac0-8e7e-f3e148f3463f',
  ])('rejects %s', (value) => {
    expect(isUuid(value)).toBe(false);
  });
});

describe('decodeDefinition', () => {
  it('decodes unpadded base64url JSON', () => {
    expect(decodeDefinition(encode(validDefinition))).toEqual(validDefinition);
  });

  it('accepts padding', () => {
    const encoded = encode({ v: 1, criteria: [{ type: 'demographics', gender: 'female' }] });
    expect(encoded.length % 4).toBe(3);
    expect(decodeDefinition(`${encoded}=`).criteria).toEqual([{ type: 'demographics', gender: 'female' }]);
  });

  it('gives a translation key, default text and values for each rejection', () => {
    expect(() => decodeDefinition('A'.repeat(1_000_000))).toThrow(
      expect.objectContaining({
        key: 'definitionTooLarge',
        defaultMessage: 'Definition is larger than {{maxBytes}} bytes',
        options: { maxBytes: MAX_DEFINITION_BYTES },
      }),
    );
  });

  it('decodes UTF-8 labels', () => {
    const definition = { v: 1, label: 'Wagonjwa wa kike – ናሙና 🙂', criteria: [{ type: 'demographics', minAge: 1 }] };
    expect(decodeDefinition(encode(definition)).label).toBe(definition.label);
  });

  it('keeps an HTML-looking label as plain data', () => {
    const label = '<img src=x onerror=alert(1)>';
    expect(decodeDefinition(encode({ ...validDefinition, label })).label).toBe(label);
  });

  it.each([
    [
      'standard base64 characters',
      Buffer.from(JSON.stringify(validDefinition)).toString('base64').replace(/=+$/, '') + '+/',
    ],
    ['other characters', 'eyJ2Ijox!'],
    ['whitespace', 'eyJ2 Ijox'],
    ['an impossible length', 'eyJ2I'],
    ['padding in the middle', 'ey=J2'],
  ])('rejects %s', (_, encoded) => {
    expect(() => decodeDefinition(encoded)).toThrow('Definition is not valid base64url');
  });

  it('rejects bytes that are not UTF-8', () => {
    expect(() => decodeDefinition(Buffer.from([0x7b, 0xff, 0x7d]).toString('base64url'))).toThrow(
      'Definition is not valid UTF-8',
    );
  });

  it.each([
    ['an empty value', ''],
    ['text', Buffer.from('hello').toString('base64url')],
    ['truncated JSON', Buffer.from('{"v":1,').toString('base64url')],
  ])('rejects %s as invalid JSON', (_, encoded) => {
    expect(() => decodeDefinition(encoded)).toThrow('Definition is not valid JSON');
  });

  describe('size cap', () => {
    // Whitespace is valid JSON, so it pads a valid definition to an exact byte size.
    const paddedTo = (bytes: number) => {
      const json = JSON.stringify(validDefinition);
      return Buffer.from(json.slice(0, -1) + ' '.repeat(bytes - json.length) + '}').toString('base64url');
    };

    it(`accepts exactly ${MAX_DEFINITION_BYTES} bytes`, () => {
      expect(decodeDefinition(paddedTo(MAX_DEFINITION_BYTES))).toEqual(validDefinition);
    });

    it(`rejects ${MAX_DEFINITION_BYTES + 1} bytes`, () => {
      expect(() => decodeDefinition(paddedTo(MAX_DEFINITION_BYTES + 1))).toThrow(
        `Definition is larger than ${MAX_DEFINITION_BYTES} bytes`,
      );
    });

    it('rejects a very long value before decoding it', () => {
      expect(() => decodeDefinition('A'.repeat(1_000_000))).toThrow(
        `Definition is larger than ${MAX_DEFINITION_BYTES} bytes`,
      );
    });

    it('counts bytes, not characters', () => {
      const definition = { ...validDefinition, label: '🙂'.repeat(100) };
      const json = JSON.stringify(definition);
      const bytes = Buffer.byteLength(json);
      const padded = json.slice(0, -1) + ' '.repeat(MAX_DEFINITION_BYTES + 1 - bytes) + '}';
      expect(padded.length).toBeLessThan(MAX_DEFINITION_BYTES);
      expect(() => decodeDefinition(Buffer.from(padded).toString('base64url'))).toThrow('larger than');
    });
  });
});

describe('encodeDefinition', () => {
  it('writes unpadded base64url of the UTF-8 JSON, which decodes back to the same definition', () => {
    const encoded = encodeDefinition(validDefinition as CohortDefinition);
    expect(encoded).toBe(encode(validDefinition));
    expect(encoded).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(decodeDefinition(encoded)).toEqual(validDefinition);
  });

  it('keeps text outside Latin-1 intact', () => {
    const definition: CohortDefinition = {
      v: 1,
      label: 'Femmes âgées 15–49 · 女性 🩺',
      criteria: [{ type: 'demographics', gender: 'female' }],
    };
    expect(decodeDefinition(encodeDefinition(definition)).label).toBe(definition.label);
  });

  it('uses the URL alphabet', () => {
    // A label of "?>?" puts "Pz4/" in standard base64 and "Pz4_" in base64url.
    const definition: CohortDefinition = { v: 1, label: '??>?', criteria: [{ type: 'demographics', minAge: 1 }] };
    expect(Buffer.from(JSON.stringify(definition)).toString('base64')).toMatch(/[+/]/);
    expect(encodeDefinition(definition)).toBe(encode(definition));
  });

  it.each<[string, CohortDefinition]>([
    ['no criteria', { v: 1, criteria: [] }],
    ['maxAge 0', { v: 1, criteria: [{ type: 'demographics', maxAge: 0 }] }],
    ['an empty demographics criterion', { v: 1, criteria: [{ type: 'demographics', gender: 'any' }] }],
    ['a program that is not a uuid', { v: 1, criteria: [{ type: 'enrollment', programs: ['../session'] }] }],
    [
      'a label over 200 characters',
      { v: 1, label: 'x'.repeat(201), criteria: validDefinition.criteria as CohortDefinition['criteria'] },
    ],
    [
      `more than ${MAX_DEFINITION_BYTES} bytes`,
      {
        v: 1,
        criteria: Array.from({ length: 5 }, (_, i) => ({
          type: 'drugOrder' as const,
          drugs: Array.from(
            { length: 50 },
            (_, j) => `${String(i * 50 + j).padStart(8, '0')}-0000-4000-8000-000000000000`,
          ),
        })),
      },
    ],
  ])('makes no link the builder would reject: %s', (_, definition) => {
    expect(() => validateDefinition(definition) && decodeDefinition(encode(definition))).toThrow();
    expect(encodeDefinition(definition)).toBeNull();
  });
});

describe('validateDefinition', () => {
  const withCriterion = (criterion: unknown) => ({ v: 1, criteria: [criterion] });

  it('accepts the example definition', () => {
    expect(validateDefinition(validDefinition)).toEqual(validDefinition);
  });

  it('accepts every optional field', () => {
    const definition = {
      v: 1,
      criteria: [
        { type: 'demographics', gender: 'male' },
        { type: 'demographics', gender: 'any', minAge: 0, maxAge: 1 },
        {
          type: 'enrollment',
          programs: [cielStyleUuid],
          enrolledOnOrAfter: '2024-01-01',
          enrolledOnOrBefore: '2024-12-31',
        },
        {
          type: 'drugOrder',
          drugs: Array(50).fill(drugUuid),
          activeOnOrAfter: '2024-02-29',
          activeOnOrBefore: 'today',
        },
        { type: 'encounter', encounterTypes: Array(10).fill(encounterTypeUuid) },
      ],
    };
    expect(validateDefinition(definition)).toEqual(definition);
  });

  it('defaults gender to "any"', () => {
    expect(validateDefinition(withCriterion({ type: 'demographics', minAge: 18 })).criteria[0]).toEqual({
      type: 'demographics',
      gender: 'any',
      minAge: 18,
    });
  });

  it.each([
    ['an array', [validDefinition], 'Definition must be a JSON object'],
    ['null', null, 'Definition must be a JSON object'],
    ['a string', 'definition', 'Definition must be a JSON object'],
    ['a number', 1, 'Definition must be a JSON object'],
    ['a missing version', { criteria: validDefinition.criteria }, '"v" must be 1'],
    ['version 2', { ...validDefinition, v: 2 }, '"v" must be 1'],
    ['version "1"', { ...validDefinition, v: '1' }, '"v" must be 1'],
    ['an unknown top-level key', { ...validDefinition, sql: 'select 1' }, 'Definition has an unknown key "sql"'],
    ['a __proto__ key', JSON.parse('{"v":1,"criteria":[],"__proto__":{"x":1}}'), 'unknown key "__proto__"'],
    ['a label that is not text', { ...validDefinition, label: 7 }, '"label" must be text'],
    ['a label over 200 characters', { ...validDefinition, label: 'x'.repeat(201) }, '"label" must be text'],
    ['missing criteria', { v: 1 }, '"criteria" must list 1 to 5 criteria'],
    ['criteria that are not a list', { v: 1, criteria: {} }, '"criteria" must list 1 to 5 criteria'],
    ['no criteria', { v: 1, criteria: [] }, '"criteria" must list 1 to 5 criteria'],
    [
      'six criteria',
      { v: 1, criteria: Array(6).fill({ type: 'demographics', minAge: 1 }) },
      '"criteria" must list 1 to 5',
    ],
  ])('rejects %s', (_, definition, message) => {
    expect(() => validateDefinition(definition)).toThrow(message);
  });

  it('accepts a label of exactly 200 characters', () => {
    expect(validateDefinition({ ...validDefinition, label: 'x'.repeat(200) }).label).toHaveLength(200);
  });

  it.each([
    ['a criterion that is not an object', 'demographics', 'Criterion 1: "type" must be'],
    ['a null criterion', null, 'Criterion 1: "type" must be'],
    ['a missing type', { gender: 'male' }, 'Criterion 1: "type" must be'],
    ['an unknown type', { type: 'concept', concept: cielStyleUuid }, 'Criterion 1: "type" must be'],
    ['a type that is a prototype key', { type: 'constructor' }, 'Criterion 1: "type" must be'],
    ['an array criterion', Object.assign(['x'], { type: 'demographics' }), 'Criterion 1 must be a JSON object'],

    ['an unknown demographics key', { type: 'demographics', gender: 'male', alive: true }, 'unknown key "alive"'],
    ['gender "males"', { type: 'demographics', gender: 'males' }, '"gender" must be "male", "female" or "any"'],
    ['gender null', { type: 'demographics', gender: null, minAge: 1 }, '"gender" must be'],
    ['a fractional age', { type: 'demographics', minAge: 1.5 }, '"minAge" must be a whole number from 0 to 150'],
    ['a negative age', { type: 'demographics', minAge: -1 }, '"minAge" must be a whole number'],
    ['an age over 150', { type: 'demographics', maxAge: 151 }, '"maxAge" must be a whole number'],
    ['maxAge 0', { type: 'demographics', maxAge: 0 }, '"maxAge" must be a whole number from 1 to 150'],
    ['minAge and maxAge 0', { type: 'demographics', minAge: 0, maxAge: 0 }, '"maxAge" must be a whole number from 1'],
    ['an age as text', { type: 'demographics', minAge: '15' }, '"minAge" must be a whole number'],
    ['a null age', { type: 'demographics', gender: 'male', maxAge: null }, '"maxAge" must be a whole number'],
    [
      'minAge over maxAge',
      { type: 'demographics', minAge: 50, maxAge: 49 },
      '"minAge" must not be greater than "maxAge"',
    ],
    ['no demographic filter', { type: 'demographics' }, 'give a gender, "minAge" or "maxAge"'],
    ['only gender "any"', { type: 'demographics', gender: 'any' }, 'give a gender, "minAge" or "maxAge"'],

    [
      'an unknown enrollment key',
      { type: 'enrollment', programs: [programUuid], location: 'x' },
      'unknown key "location"',
    ],
    ['missing programs', { type: 'enrollment' }, '"programs" must list 1 to 10 uuids'],
    ['no programs', { type: 'enrollment', programs: [] }, '"programs" must list 1 to 10 uuids'],
    ['11 programs', { type: 'enrollment', programs: Array(11).fill(programUuid) }, '"programs" must list 1 to 10'],
    ['a program that is not a uuid', { type: 'enrollment', programs: ['HIV'] }, '"programs" must list 1 to 10 uuids'],
    ['programs as text', { type: 'enrollment', programs: programUuid }, '"programs" must list 1 to 10 uuids'],
    [
      'a date in another format',
      { type: 'enrollment', programs: [programUuid], enrolledOnOrAfter: '01/02/2024' },
      '"enrolledOnOrAfter" must be a date like 2024-01-31',
    ],
    [
      'a date that does not exist',
      { type: 'enrollment', programs: [programUuid], enrolledOnOrBefore: '2023-02-29' },
      '"enrolledOnOrBefore" must be a date',
    ],
    [
      'a date with a time',
      { type: 'enrollment', programs: [programUuid], enrolledOnOrAfter: '2024-01-01T00:00:00Z' },
      '"enrolledOnOrAfter" must be a date',
    ],
    [
      '"today" for an enrollment date',
      { type: 'enrollment', programs: [programUuid], enrolledOnOrAfter: 'today' },
      '"enrolledOnOrAfter" must be a date',
    ],

    [
      'an unknown drug order key',
      { type: 'drugOrder', drugs: [drugUuid], careSetting: 'x' },
      'unknown key "careSetting"',
    ],
    ['missing drugs', { type: 'drugOrder' }, '"drugs" must list 1 to 50 uuids'],
    ['51 drugs', { type: 'drugOrder', drugs: Array(51).fill(drugUuid) }, '"drugs" must list 1 to 50 uuids'],
    ['a drug that is not a uuid', { type: 'drugOrder', drugs: [drugUuid, 7] }, '"drugs" must list 1 to 50 uuids'],
    [
      'a relative date other than "today"',
      { type: 'drugOrder', drugs: [drugUuid], activeOnOrAfter: 'yesterday' },
      '"activeOnOrAfter" must be "today" or a date like 2024-01-31',
    ],
    [
      'a month that does not exist',
      { type: 'drugOrder', drugs: [drugUuid], activeOnOrBefore: '2024-13-01' },
      '"activeOnOrBefore" must be "today" or a date',
    ],

    [
      'an unknown encounter key',
      { type: 'encounter', encounterTypes: [encounterTypeUuid], formList: [encounterTypeUuid] },
      'unknown key "formList"',
    ],
    ['missing encounter types', { type: 'encounter' }, '"encounterTypes" must list 1 to 10 uuids'],
    ['no encounter types', { type: 'encounter', encounterTypes: [] }, '"encounterTypes" must list 1 to 10 uuids'],
    [
      '11 encounter types',
      { type: 'encounter', encounterTypes: Array(11).fill(encounterTypeUuid) },
      '"encounterTypes" must list 1 to 10 uuids',
    ],
    [
      'an encounter type that is not a uuid',
      { type: 'encounter', encounterTypes: ['Adult Visit'] },
      '"encounterTypes" must list 1 to 10 uuids',
    ],
    [
      'a definition library key in place of an encounter type',
      { type: 'encounter', encounterTypes: ['reporting.library.cohortDefinition.builtIn.males'] },
      '"encounterTypes" must list 1 to 10 uuids',
    ],
  ])('rejects %s', (_, criterion, message) => {
    expect(() => validateDefinition(withCriterion(criterion))).toThrow(message);
  });

  it('names the criterion that failed', () => {
    const definition = {
      v: 1,
      criteria: [
        { type: 'demographics', minAge: 1 },
        { type: 'enrollment', programs: [] },
      ],
    };
    expect(() => validateDefinition(definition)).toThrow('Criterion 2: "programs" must list 1 to 10 uuids');
  });
});

describe('toQueryDate', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-17T15:30:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('resolves "today" to midnight of the current day, when called', () => {
    expect(toQueryDate('today')).toBe('2026-10-17T00:00:00+00:00');

    vi.setSystemTime(new Date('2027-01-02T08:00:00Z'));
    expect(toQueryDate('today')).toBe('2027-01-02T00:00:00+00:00');
  });

  it('formats a date like the date pickers do', () => {
    expect(toQueryDate('2024-02-29')).toBe('2024-02-29T00:00:00+00:00');
  });

  it('turns a missing date into an empty string', () => {
    expect(toQueryDate(undefined)).toBe('');
  });
});

describe('buildSearch', () => {
  const drugOrderSearchKey = 'reporting.library.cohortDefinition.builtIn.drugOrderSearch';
  const names = new Map([
    [programUuid, 'HIV Program'],
    [drugUuid, 'Triomune-30'],
    [otherDrugUuid, 'Efavirenz'],
    [encounterTypeUuid, 'Adult Visit'],
  ]);

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-17T15:30:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('describes demographics like the demographics tab', () => {
    expect(
      buildSearch({ type: 'demographics', gender: 'female', minAge: 15, maxAge: 49 }, names, drugOrderSearchKey)
        .description,
    ).toBe('Female Patients with ages between 15 and 49 years that are alive');
    expect(buildSearch({ type: 'demographics', gender: 'any', maxAge: 5 }, names, drugOrderSearchKey).description).toBe(
      'All Patients with maximum age of 5 years that are alive',
    );
  });

  it('maps gender onto the built-in cohort definitions', () => {
    const keys = (gender: 'male' | 'female' | 'any') =>
      buildSearch(
        { type: 'demographics', gender, minAge: 1 },
        names,
        drugOrderSearchKey,
      ).searchParams.query.rowFilters.map((f) => f.key);

    expect(keys('male')).toContain('reporting.library.cohortDefinition.builtIn.males');
    expect(keys('female')).toContain('reporting.library.cohortDefinition.builtIn.females');
    expect(keys('any').some((key) => /\.(males|females)$/.test(key))).toBe(false);
  });

  it('describes enrollments with program names', () => {
    expect(buildSearch({ type: 'enrollment', programs: [programUuid] }, names, drugOrderSearchKey).description).toBe(
      'Patients enrolled in HIV Program',
    );
  });

  it('counts the programs and drugs whose names are missing', () => {
    const search = buildSearch(
      { type: 'enrollment', programs: [programUuid, cielStyleUuid] },
      names,
      drugOrderSearchKey,
    );
    expect(search.description).toBe('Patients enrolled in HIV Program, 1 more program');
    expect(search.searchParams.query.rowFilters[0].parameterValues).toEqual({
      programs: [programUuid, cielStyleUuid],
    });

    expect(buildSearch({ type: 'drugOrder', drugs: [drugUuid] }, new Map(), drugOrderSearchKey).description).toBe(
      'Patients who taking 1 drug',
    );
    expect(
      buildSearch(
        { type: 'drugOrder', drugs: [drugUuid, cielStyleUuid, '5089AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'] },
        names,
        drugOrderSearchKey,
      ).description,
    ).toBe('Patients who taking Triomune-30 and 2 more drugs');
  });

  it('searches encounters by type only, as the encounters tab does, and describes them with their names', () => {
    const search = buildSearch(
      { type: 'encounter', encounterTypes: [encounterTypeUuid, cielStyleUuid] },
      names,
      drugOrderSearchKey,
    );
    expect(search.searchParams.query.rowFilters).toEqual([
      {
        key: 'reporting.library.cohortDefinition.builtIn.encounterSearchAdvanced',
        parameterValues: { encounterTypeList: [encounterTypeUuid, cielStyleUuid] },
        type: 'org.openmrs.module.reporting.dataset.definition.PatientDataSetDefinition',
      },
    ]);
    expect(search.searchParams.query.customRowFilterCombination).toBe('1');
    // The encounters tab's own words, double space and all: it swaps the last comma for " and ".
    expect(search.description).toBe('Patients with Encounter of Types Adult Visit and  1 more encounter type');
  });

  it('describes drug orders with drug names and dates', () => {
    expect(
      buildSearch(
        { type: 'drugOrder', drugs: [drugUuid, otherDrugUuid], activeOnOrAfter: 'today' },
        names,
        drugOrderSearchKey,
      ).description,
    ).toMatch(/^Patients who taking Triomune-30 and Efavirenz on or after /);
  });

  it('uses the configured drug order search definition key', () => {
    const search = buildSearch(
      { type: 'drugOrder', drugs: [drugUuid] },
      names,
      'configuration.definitionlibrary.cohort.drugOrderSearch',
    );
    expect(search.searchParams.query.rowFilters.map((filter) => filter.key)).toEqual([
      'configuration.definitionlibrary.cohort.drugOrderSearch',
    ]);
  });

  it('resolves "today" when the search is built', () => {
    const activeOnOrAfter = () =>
      buildSearch({ type: 'drugOrder', drugs: [drugUuid], activeOnOrAfter: 'today' }, names, drugOrderSearchKey)
        .searchParams.query.rowFilters[0].parameterValues;

    expect(activeOnOrAfter()).toEqual({ activeOnOrAfter: '2026-10-17T00:00:00+00:00', drugs: [drugUuid] });
    vi.setSystemTime(new Date('2026-10-18T00:00:01Z'));
    expect(activeOnOrAfter()).toEqual({ activeOnOrAfter: '2026-10-18T00:00:00+00:00', drugs: [drugUuid] });
  });
});

// Golden contract fixtures: links the omnibar built (parseCohortCriteria + definitionUrl, shipped config
// defaults) before its cohort rows moved here. src/omnibar/parse-cohort-criteria.test.ts builds the same
// links from the same file, so a change to either side fails a test.
describe('golden contract fixtures', () => {
  it.each(goldenFixtures)('accepts the omnibar link for "$text"', ({ url, definition }) => {
    expect(url.startsWith('${openmrsSpaBase}/cohort-builder?definition=')).toBe(true);
    const params = new URLSearchParams(url.split('?')[1]);
    expect(readUrlRequest(params)).toEqual({ type: 'definition', definition });
  });

  // Criteria → encode → decode → the same criteria, and the very link the omnibar shipped.
  it.each(goldenFixtures)('round-trips the definition for "$text"', ({ url, definition }) => {
    const encoded = encodeDefinition(definition as CohortDefinition);
    expect(encoded).toBe(new URLSearchParams(url.split('?')[1]).get('definition'));
    expect(decodeDefinition(encoded).criteria).toEqual(definition.criteria);
  });
});
