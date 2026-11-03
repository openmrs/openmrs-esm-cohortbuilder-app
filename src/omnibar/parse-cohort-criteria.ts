import {
  type CohortDrugGroup,
  type CohortEncounterType,
  type CohortProgram,
  type ConfigObject,
} from '../config-schema';
import {
  type CohortDefinition,
  type Criterion,
  isUuid,
  MAX_AGE,
  MAX_CRITERIA,
  MAX_DRUGS,
  MAX_LABEL_LENGTH,
  MAX_TEST_VALUE,
  MAX_WITHIN_DAYS,
  MAX_WITHIN_MONTHS,
  type TestOperator,
  type TestResult,
} from '../url-definition/url-definition';
import {
  type CompiledPhrases,
  compilePhrases,
  matchPhrase,
  type PhraseAdditions,
  tokenize,
} from './phrases/phrase-table';

/**
 * Turns plain English like "how many women aged 15-49 on ARVs?" into a cohort builder definition.
 * Every word must be understood or be a stopword; anything else returns null, so the omnibar never
 * shows a cohort that is a guess at what was typed. No network, no model. The words are data, in
 * `phrases/en.json` plus a site's `omnibar.phrases`; the names are programs, drug groups and
 * encounter types from config and, in the omnibar, from the server. The limits and the uuid check are
 * the decoder's own, in url-definition.ts.
 */

export interface CohortCriteriaConfig {
  /** When false, drug groups are unknown words, so "on ARVs" makes the whole text unparseable. */
  drugCriteriaEnabled: boolean;
  programs: Array<CohortProgram>;
  drugGroups: Array<CohortDrugGroup>;
  /** Encounter types read as "<alias> encounter". None configured, none understood. */
  encounterTypes?: Array<CohortEncounterType>;
  /**
   * Numeric tests, read as "<name> <comparison> <value>", in the concept's units. In the omnibar they
   * come from the server's concept names for the words the parser couldn't otherwise read.
   */
  tests?: Array<CohortTest>;
  /** The phrase table to read with. The shipped English one when not given. */
  phrases?: CompiledPhrases;
}

/** A numeric concept the parser can read by name, with the units its values are in. */
export interface CohortTest {
  uuid: string;
  label: string;
  aliases: Array<string>;
  units: string;
}

const isObject = (value: unknown) => typeof value === 'object' && value !== null && !Array.isArray(value);

/** drugCriteriaEnabled says what the server can run, so it sits at the top of the config. */
export function cohortCriteriaConfig(config: ConfigObject): CohortCriteriaConfig {
  return {
    drugCriteriaEnabled: config.drugCriteriaEnabled,
    programs: config.omnibar.programs,
    drugGroups: config.omnibar.drugGroups,
    encounterTypes: config.omnibar.encounterTypes,
    phrases: compilePhrases(
      undefined,
      isObject(config.omnibar.phrases) ? (config.omnibar.phrases as PhraseAdditions) : undefined,
    ),
  };
}

type Gender = 'male' | 'female';

type Clause =
  | { kind: 'gender'; gender: Gender }
  | { kind: 'age'; minAge?: number; maxAge?: number; gender?: Gender; group?: boolean }
  | { kind: 'program'; program: CohortProgram }
  | { kind: 'drugGroup'; group: CohortDrugGroup }
  | { kind: 'encounter'; encounterType: CohortEncounterType }
  | ({ kind: 'test'; test: CohortTest; operator: TestOperator; value: number; which?: TestResult } & TestWindow);

interface TestWindow {
  withinLastMonths?: number;
  withinLastDays?: number;
  onOrAfter?: string;
}

interface Match {
  next: number;
  clause: Clause;
}

interface AgeReading {
  next: number;
  minAge?: number;
  maxAge?: number;
  gender?: Gender;
  /** A named group, such as "adolescents", whose band bounds written as numbers narrow. */
  group?: boolean;
}

/** A whole number of up to three digits, or in words: "nine", "nineteen", "forty", "forty nine", "forty-nine". */
function readNumber(tokens: Array<string>, start: number, P: CompiledPhrases): { value: number; next: number } | null {
  const token = tokens[start];
  if (/^\d{1,3}$/.test(token ?? '')) {
    return { value: Number(token), next: start + 1 };
  }
  const value = P.numbers.get(token);
  if (value === undefined) return null;
  if (value >= 20 && value % 10 === 0) {
    const hyphen = tokens[start + 1] === '-' ? 1 : 0;
    const units = P.numbers.get(tokens[start + 1 + hyphen]);
    if (units !== undefined && units >= 1 && units <= 9) {
      return { value: value + units, next: start + 2 + hyphen };
    }
  }
  return { value, next: start + 1 };
}

/**
 * A number of years: the number, then perhaps a unit. Months count only in whole years ("24 months"
 * is 2, and `months` says so), since the builder searches ages in years; any other unit makes it
 * unreadable. `old` says the unit names an age by itself ("30 years old").
 */
function readYears(
  tokens: Array<string>,
  start: number,
  P: CompiledPhrases,
): { years: number; next: number; old: boolean; months: boolean } | null {
  const number = readNumber(tokens, start, P);
  if (!number) return null;
  const { value, next } = number;
  const old = matchPhrase(tokens, next, P.yearsOld);
  const years = matchPhrase(tokens, next, P.years);
  if (old !== null || years !== null) {
    const end = Math.max(old ?? 0, years ?? 0);
    return { years: value, next: end, old: old !== null && old === end, months: false };
  }
  const months = matchPhrase(tokens, next, P.months);
  if (months !== null) {
    return value % 12 === 0 ? { years: value / 12, next: months, old: true, months: true } : null;
  }
  if (matchPhrase(tokens, next, P.otherUnits) !== null) return null;
  return { years: value, next, old: false, months: false };
}

// The last value says whether months in whole years are exact: "under 24 months" is aged 1 or younger
// and "at least 24 months" aged 2+, but "at most 12 months" would take in up to 23 months.
const comparators = [
  ['under', (n: number) => ({ maxAge: n - 1 }), true],
  ['atMost', (n: number) => ({ maxAge: n }), false],
  ['over', (n: number) => ({ minAge: n + 1 }), false],
  ['atLeast', (n: number) => ({ minAge: n }), true],
] as const;

/** Every way an age can be written at `start`; the reading that takes the most words wins. */
function matchAge(tokens: Array<string>, start: number, P: CompiledPhrases): Match | null {
  const readings: Array<AgeReading> = [];
  const aged = matchPhrase(tokens, start, P.aged);
  const from = aged ?? start;

  // "between 15 and 49", "15-49", "from 15 to 49 years", "aged 15 through 49"
  const rangeStart = matchPhrase(tokens, from, P.rangeFrom);
  const first = readYears(tokens, rangeStart ?? from, P);
  if (first) {
    const join =
      matchPhrase(tokens, first.next, P.rangeTo) ??
      (rangeStart !== null && tokens[first.next] === 'and' ? first.next + 1 : null);
    const second = join !== null ? readYears(tokens, join, P) : null;
    if (second && !first.months && !second.months) {
      readings.push({ next: second.next, minAge: first.years, maxAge: second.years });
    }
  }

  // "under 30", "at least 18", "> 65", "over the age of 50"
  for (const [list, bounds, exactInMonths] of comparators) {
    const comparator = matchPhrase(tokens, from, P[list]);
    const years = comparator !== null ? readYears(tokens, comparator, P) : null;
    if (years && (exactInMonths || !years.months)) readings.push({ next: years.next, ...bounds(years.years) });
  }

  // "30 or younger", "65+", "18 and over", "30 years old", "aged 30"
  const years = readYears(tokens, from, P);
  if (years) {
    const orUnder = matchPhrase(tokens, years.next, P.orUnder);
    const orOver = matchPhrase(tokens, years.next, P.orOver);
    if (orUnder !== null && !years.months) readings.push({ next: orUnder, maxAge: years.years });
    if (orOver !== null) readings.push({ next: orOver, minAge: years.years });
    if ((years.old || aged !== null) && !years.months) {
      readings.push({ next: years.next, minAge: years.years, maxAge: years.years });
    }
  }

  // "adolescents", "under fives", "women of reproductive age"
  if (aged === null) {
    const group = P.ageGroups.find(({ tokens: words }) =>
      words.every((word, offset) => tokens[start + offset] === word),
    );
    if (group) {
      readings.push({
        next: start + group.tokens.length,
        minAge: group.minAge,
        maxAge: group.maxAge,
        gender: group.gender,
        group: true,
      });
    }
  }

  const best = readings.reduce<AgeReading | null>(
    (longest, reading) => (!longest || reading.next > longest.next ? reading : longest),
    null,
  );
  if (!best) return null;
  const { next, ...bounds } = best;
  return { next, clause: { kind: 'age', ...bounds } };
}

function matchGender(tokens: Array<string>, start: number, P: CompiledPhrases): Match | null {
  const female = matchPhrase(tokens, start, P.female);
  const male = matchPhrase(tokens, start, P.male);
  if (female !== null && (male === null || female > male)) {
    return { next: female, clause: { kind: 'gender', gender: 'female' } };
  }
  return male !== null ? { next: male, clause: { kind: 'gender', gender: 'male' } } : null;
}

/** Whether two different words are one slip apart: a letter added, dropped or changed, or two swapped. */
export function oneSlipApart(a: string, b: string): boolean {
  if (a === b || Math.abs(a.length - b.length) > 1) return false;
  let i = 0;
  while (i < a.length && a[i] === b[i]) i++;
  if (a.length === b.length) {
    return (
      a.slice(i + 1) === b.slice(i + 1) || (a[i] === b[i + 1] && a[i + 1] === b[i] && a.slice(i + 2) === b.slice(i + 2))
    );
  }
  return a.length > b.length ? a.slice(i + 1) === b.slice(i) : a.slice(i) === b.slice(i + 1);
}

/**
 * How many slips the words typed from `start` are from a name, or null when they aren't that name: a
 * slip is allowed in a word of five letters or more that isn't a word of the phrase table. A name never
 * takes a word from `never`, so "Not HIV Program" can't make "not" part of a criterion.
 */
function slipsFrom(words: Array<string>, tokens: Array<string>, start: number, P: CompiledPhrases): number | null {
  let slips = 0;
  for (let offset = 0; offset < words.length; offset++) {
    const typed = tokens[start + offset];
    const word = words[offset];
    if (typed === undefined || P.never.has(typed)) return null;
    if (typed === word) continue;
    if (
      typed.length < 5 ||
      word.length < 5 ||
      !/^\p{L}+$/u.test(typed) ||
      P.knownWords.has(typed) ||
      !oneSlipApart(typed, word)
    ) {
      return null;
    }
    slips++;
  }
  return slips;
}

type Named = { label: string; aliases: Array<string> };

// Each item's names as words, worked out once per item rather than at every position of every keystroke.
const wordsOfNames = new WeakMap<Named, Array<Array<string>>>();

function namesOf(item: Named): Array<Array<string>> {
  let names = wordsOfNames.get(item);
  if (!names) {
    names = [item.label, ...(item.aliases ?? [])]
      .map((name) => tokenize(name ?? ''))
      // "MDR-TB" is also typed "MDR TB".
      .flatMap((words) => (words?.includes('-') ? [words, words.filter((word) => word !== '-')] : [words]))
      .filter((words) => words?.length);
    wordsOfNames.set(item, names);
  }
  return names;
}

/**
 * The item whose label or alias matches the most words from `start`: exactly if any does, else with
 * one slip in the whole name ("tuberculoses", "diabetis"). Two items reading the same words is
 * ambiguous, so neither matches.
 */
function longestAlias<T extends Named>(
  tokens: Array<string>,
  start: number,
  items: Array<T>,
  P: CompiledPhrases,
): { item: T; next: number } | null {
  for (const slips of [0, 1]) {
    let best: { item: T; next: number } | null = null;
    let tied = false;
    for (const item of items) {
      let length = 0;
      for (const words of namesOf(item)) {
        if (slipsFrom(words, tokens, start, P) === slips) {
          length = Math.max(length, words.length);
        }
      }
      if (!length) continue;
      const next = start + length;
      if (!best || next > best.next) {
        best = { item, next };
        tied = false;
      } else if (next === best.next && best.item !== item) {
        tied = true;
      }
    }
    if (best) return tied ? null : best;
  }
  return null;
}

/** "enrolled in HIV", "in the TB program", "HIV programme", "TB clinic". A bare "in HIV" is too vague. */
function matchProgram(
  tokens: Array<string>,
  start: number,
  programs: Array<CohortProgram>,
  P: CompiledPhrases,
): Match | null {
  let i = start;
  const enrolled = matchPhrase(tokens, i, P.enrolled);
  if (enrolled !== null) i = enrolled;
  for (let linkers = 0; linkers < 2; linkers++) {
    const linker = matchPhrase(tokens, i, P.programLinkers);
    if (linker === null) break;
    i = linker;
  }
  const hit = longestAlias(tokens, i, programs, P);
  if (!hit) return null;
  i = hit.next;
  // The matched name may already end in "program", as a label like "TB Program" does.
  let named = P.programNouns.some((noun) => noun.length === 1 && noun[0] === tokens[i - 1]);
  const noun = matchPhrase(tokens, i, P.programNouns);
  if (noun !== null) {
    named = true;
    i = noun;
  }
  if (enrolled === null && !named) return null;
  return { next: i, clause: { kind: 'program', program: hit.item } };
}

/** "on ARVs", "taking antiretrovirals", "receiving TLD". */
function matchDrugGroup(
  tokens: Array<string>,
  start: number,
  drugGroups: Array<CohortDrugGroup>,
  P: CompiledPhrases,
): Match | null {
  const verb = matchPhrase(tokens, start, P.drugVerbs);
  if (verb === null) return null;
  const hit = longestAlias(tokens, verb, drugGroups, P);
  return hit ? { next: hit.next, clause: { kind: 'drugGroup', group: hit.item } } : null;
}

/** "admission encounter", "vital signs encounters". The word "encounter" is required: "admission" alone is too vague. */
function matchEncounter(
  tokens: Array<string>,
  start: number,
  encounterTypes: Array<CohortEncounterType>,
  P: CompiledPhrases,
): Match | null {
  const hit = longestAlias(tokens, start, encounterTypes, P);
  const noun = hit ? matchPhrase(tokens, hit.next, P.encounterNouns) : null;
  return noun !== null ? { next: noun, clause: { kind: 'encounter', encounterType: hit.item } } : null;
}

const testComparisons = [
  ['testUnder', 'lt'],
  ['testAtMost', 'le'],
  ['testOver', 'gt'],
  ['testAtLeast', 'ge'],
  ['testEquals', 'eq'],
] as const;

const testResults = [
  ['resultLatest', 'latest'],
  ['resultFirst', 'first'],
  ['resultLowest', 'lowest'],
  ['resultHighest', 'highest'],
  ['resultAny', 'any'],
  ['resultAverage', 'average'],
] as const;

/** The phrase from `lists` that matches the most words at `start`, with what it stands for. */
function longestOf<T>(
  tokens: Array<string>,
  start: number,
  lists: ReadonlyArray<readonly [keyof CompiledPhrases, T]>,
  P: CompiledPhrases,
): { next: number; value: T } | null {
  let best: { next: number; value: T } | null = null;
  for (const [list, value] of lists) {
    const next = matchPhrase(tokens, start, P[list] as Array<Array<string>>);
    if (next !== null && (!best || next > best.next)) best = { next, value };
  }
  return best;
}

/** A test value: digits, perhaps with decimals ("1000", "49.5"), or a small number in words. */
function readValue(tokens: Array<string>, start: number, P: CompiledPhrases): { value: number; next: number } | null {
  const token = tokens[start];
  if (/^\d{1,13}(\.\d{1,6})?$/.test(token ?? '')) {
    const value = Number(token);
    return value <= MAX_TEST_VALUE ? { value, next: start + 1 } : null;
  }
  return readNumber(tokens, start, P);
}

/** Units compared as written, but with "per" read as "/" and µ as u: "cells/µL" is "cells per uL". */
const unitWords = (words: Array<string>) => words.map((word) => (word === 'per' ? '/' : word.replace(/[µμ]/g, 'u')));

/** The concept's units at `start`, typed as the concept writes them, or null. */
function readUnits(tokens: Array<string>, start: number, units: string): number | null {
  const wanted = unitWords(tokenize(units) ?? []);
  if (!wanted.length) return null;
  const typed = unitWords(tokens.slice(start, start + wanted.length));
  return wanted.every((word, offset) => typed[offset] === word) ? start + wanted.length : null;
}

const isRealDate = (year: number, month: number, day: number) => {
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
};

/** "in the last 6 months", "past 2 weeks", "since 2025", "since 2025-03-01". */
function readWindow(
  tokens: Array<string>,
  start: number,
  P: CompiledPhrases,
): { next: number; window: TestWindow } | null {
  const last = matchPhrase(tokens, start, P.windowStart);
  if (last !== null) {
    // A whole number of up to four digits ("3650 days"), or a small one in words ("six months").
    const count = /^\d{1,4}$/.test(tokens[last] ?? '')
      ? { value: Number(tokens[last]), next: last + 1 }
      : readNumber(tokens, last, P);
    if (!count || count.value < 1) return null;
    const unit = longestOf(
      tokens,
      count.next,
      [
        ['windowDays', 1],
        ['windowWeeks', 7],
        ['windowMonths', -1],
        ['windowYears', -12],
      ] as const,
      P,
    );
    if (!unit) return null;
    const window: TestWindow =
      unit.value > 0 ? { withinLastDays: count.value * unit.value } : { withinLastMonths: count.value * -unit.value };
    if ((window.withinLastDays ?? 0) > MAX_WITHIN_DAYS || (window.withinLastMonths ?? 0) > MAX_WITHIN_MONTHS)
      return null;
    return { next: unit.next, window };
  }
  const since = matchPhrase(tokens, start, P.since);
  const year = since !== null ? tokens[since] : undefined;
  if (!/^(19|20)\d\d$/.test(year ?? '')) return null;
  // "since 2025-03-01": the tokenizer keeps the dashes as words of their own.
  const [dash1, month, dash2, day] = tokens.slice(since + 1, since + 5);
  if (dash1 === '-' && /^\d{2}$/.test(month ?? '') && dash2 === '-' && /^\d{2}$/.test(day ?? '')) {
    if (!isRealDate(Number(year), Number(month), Number(day))) return null;
    return { next: since + 5, window: { onOrAfter: `${year}-${month}-${day}` } };
  }
  return { next: since + 1, window: { onOrAfter: `${year}-01-01` } };
}

/**
 * "most recent viral load > 1000", "lowest CD4 count under 200 cells/µL in the last 6 months",
 * "viral load ever above 1000". The result words come before the name, except "ever" and its kind
 * just after it; the value is in the concept's units, and a unit typed after it must be those.
 */
function matchTest(tokens: Array<string>, start: number, tests: Array<CohortTest>, P: CompiledPhrases): Match | null {
  if (!tests.length) return null;
  let i = start;
  const before = longestOf(tokens, i, testResults, P);
  if (before) i = before.next;
  const hit = longestAlias(tokens, i, tests, P);
  if (!hit) return null;
  i = hit.next;
  let which: TestResult | undefined = before?.value;
  if (!which) {
    const ever = matchPhrase(tokens, i, P.resultAny);
    if (ever !== null) {
      which = 'any';
      i = ever;
    }
  }
  const comparison = longestOf(tokens, i, testComparisons, P);
  if (!comparison) return null;
  const value = readValue(tokens, comparison.next, P);
  if (!value) return null;
  i = readUnits(tokens, value.next, hit.item.units) ?? value.next;
  const window = readWindow(tokens, i, P);
  return {
    next: window?.next ?? i,
    clause: {
      kind: 'test',
      test: hit.item,
      operator: comparison.value,
      value: value.value,
      ...(which && which !== 'latest' && { which }),
      ...window?.window,
    },
  };
}

function describeAge(minAge?: number, maxAge?: number): string | null {
  if (minAge != null && maxAge != null) return minAge === maxAge ? `aged ${minAge}` : `aged ${minAge}–${maxAge}`;
  if (minAge != null) return `aged ${minAge}+`;
  if (maxAge != null) return `aged ${maxAge} or younger`;
  return null;
}

const isAge = (value: number | undefined) =>
  value == null || (Number.isInteger(value) && value >= 0 && value <= MAX_AGE);

const joiners = new Set(['and', 'with']);
const isPopulation = (clause: Clause) => clause.kind === 'gender' || (clause.kind === 'age' && clause.group);
const operatorSigns: Record<TestOperator, string> = { lt: '<', le: '<=', eq: '=', ge: '>=', gt: '>' };

/** The result, in the words the builder's Concepts tab uses for it. */
const resultWords: Record<TestResult, string> = {
  latest: 'most recent',
  first: 'earliest',
  lowest: 'lowest',
  highest: 'highest',
  any: 'any',
  average: 'average',
};

/**
 * The question's clauses in order, or where reading stopped: the first word that is neither part of
 * a criterion nor a stopword. Each clause says whether "and", "with" or a comma came before it, since
 * the last one; `afterComma` holds the token indices a comma stood before.
 */
function readClauses(
  tokens: Array<string>,
  config: CohortCriteriaConfig,
  P: CompiledPhrases,
  afterComma: Set<number> = new Set(),
): { matches: Array<Match & { joined: boolean }> } | { unreadAt: number; matched: number } {
  const configuredDrugGroups = config.drugCriteriaEnabled ? config.drugGroups ?? [] : [];
  const matches: Array<Match & { joined: boolean }> = [];
  let joined = false;
  let i = 0;
  while (i < tokens.length) {
    if (afterComma.has(i)) joined = true;
    // Criteria before stopwords, so "at least" is read before "at" could be skipped, and the reading
    // that takes the most words, so "women of reproductive age" is one age group, not "women".
    const match = [
      matchGender(tokens, i, P),
      matchAge(tokens, i, P),
      matchProgram(tokens, i, config.programs ?? [], P),
      matchDrugGroup(tokens, i, configuredDrugGroups, P),
      matchEncounter(tokens, i, config.encounterTypes ?? [], P),
      matchTest(tokens, i, config.tests ?? [], P),
    ].reduce<Match | null>(
      (longest, reading) => (reading && (!longest || reading.next > longest.next) ? reading : longest),
      null,
    );
    if (match) {
      matches.push({ ...match, joined });
      joined = false;
      i = match.next;
      continue;
    }
    const stopword = matchPhrase(tokens, i, P.stopwords);
    if (stopword === null) return { unreadAt: i, matched: matches.length };
    if (tokens.slice(i, stopword).some((token) => joiners.has(token))) joined = true;
    i = stopword;
  }
  return { matches };
}

/**
 * The words that stopped the parser, as typed, when they could be a test's name: from the first word
 * it couldn't read up to the comparison or window that follows ("viral load" in "patients with viral
 * load over 1000"), at most six words with a letter among them, followed by a comparison or still
 * being typed after other words. The omnibar looks these up among the server's concept names. Null
 * when the text reads, or the words can't be a test's name.
 */
export function unreadWords(text: string, config: CohortCriteriaConfig): string | null {
  const span = unreadSpan(text, config);
  return span && (span.compared || span.beingTyped) ? span.words : null;
}

/**
 * The test name being typed at the end of the text, after a criterion or a result word ("vir" in
 * "women with vir"), which completions may finish. Never words after stopwords alone.
 */
export function typedTestWords(text: string, config: CohortCriteriaConfig): string | null {
  const span = unreadSpan(text, config);
  return span?.beingTyped ? span.words : null;
}

/**
 * The words after "enrolled", "in", "the" or another program word at the end of text that doesn't
 * read yet, which could be the start of a program's name ("tub" in "enrolled in tub"), longest
 * first, at most four words each.
 */
export function typedProgramWords(text: string, config: CohortCriteriaConfig): Array<string> {
  const P = config.phrases ?? compilePhrases();
  const tokens = tokenize(text);
  if (!tokens?.length || parseCohortCriteria(text, config)) return [];
  const tails: Array<string> = [];
  for (let start = Math.max(1, tokens.length - 4); start < tokens.length; start++) {
    const afterProgramWord = [P.enrolled, P.programLinkers].some((list) =>
      list.some(
        (phrase) =>
          start - phrase.length >= 0 && phrase.every((word, offset) => tokens[start - phrase.length + offset] === word),
      ),
    );
    const words = tokens.slice(start);
    if (afterProgramWord && words.every((word) => /^[\p{L}\p{N}]+$/u.test(word))) {
      tails.push(words.join(' '));
    }
  }
  return tails;
}

/** The words that stopped the parser, and whether a comparison follows them or they are being typed. */
function unreadSpan(
  text: string,
  config: CohortCriteriaConfig,
): { words: string; compared: boolean; beingTyped: boolean } | null {
  const P = config.phrases ?? compilePhrases();
  const tokens = tokenize(text);
  if (!tokens?.length) return null;
  const read = readClauses(tokens, config, P);
  if (!('unreadAt' in read)) return null;
  // A result word that came before the name ("latest vir") is the user's, not the name's.
  const resultWord = longestOf(tokens, read.unreadAt, testResults, P);
  const start = resultWord?.next ?? read.unreadAt;
  // "enrolled in tub", "in the tub": a program being typed, never a test's name to look up.
  if (!resultWord && [P.enrolled, P.programLinkers].some((list) => matchPhrase(tokens, start, list) !== null)) {
    return null;
  }
  let end = start;
  while (
    end < tokens.length &&
    !longestOf(tokens, end, testComparisons, P) &&
    matchPhrase(tokens, end, P.windowStart) === null &&
    matchPhrase(tokens, end, P.since) === null &&
    !P.never.has(tokens[end])
  ) {
    end++;
  }
  const words = tokens.slice(start, end);
  if (!words.length || words.length > 6 || !words.some((word) => /\p{L}/u.test(word))) return null;
  // Only words that could be a test: a comparison follows them, or they are still being typed after a
  // criterion or a result word ("women with vir", "latest vir"). Stopwords alone aren't enough, so
  // "patients with Mary Achieng" never sends a patient's name to concept search.
  const compared = end < tokens.length && Boolean(longestOf(tokens, end, testComparisons, P));
  const beingTyped = end === tokens.length && (read.matched > 0 || resultWord !== null);
  // Put back what the tokenizer split: "cd4", not "cd 4", when that is how it was typed.
  const typed = text.normalize('NFKC').toLowerCase();
  const joined = words.reduce((so, word) => {
    if (!so) return word;
    const last = so.split(' ').at(-1);
    return typed.includes(`${last}${word}`) && !typed.includes(`${last} ${word}`) ? `${so}${word}` : `${so} ${word}`;
  }, '');
  return { words: joined, compared, beingTyped };
}

export function parseCohortCriteria(text: string, config: CohortCriteriaConfig): CohortDefinition | null {
  const P = config.phrases ?? compilePhrases();
  // A comma or semicolon is skipped wherever it stands, within a phrase or a name too, but joins two
  // populations as "and" does: "women, children" is two.
  const tokens: Array<string> = [];
  const afterComma = new Set<number>();
  for (const token of tokenize(text, true) ?? []) {
    if (token === ',') afterComma.add(tokens.length);
    else tokens.push(token);
  }
  // A cohort needs at least one word: "50+" or "15-49" on their own could be anything.
  if (!tokens.some((token) => /\p{L}/u.test(token))) {
    return null;
  }

  let gender: Gender | undefined;
  let minAge: number | undefined;
  let maxAge: number | undefined;
  // Named groups' bands. Bounds written as numbers narrow them: "children under 5" is under 5.
  let bandMin = 0;
  let bandMax = MAX_AGE;
  let banded = false;
  const programs: Array<CohortProgram> = [];
  const drugGroups: Array<CohortDrugGroup> = [];
  const encounterTypes: Array<CohortEncounterType> = [];
  const tests: Array<Extract<Clause, { kind: 'test' }>> = [];

  // Whether a gender or a named age group was read, and "and", "with" or a comma came after one, at any
  // distance or right after it.
  let population = false;
  let joined = false;
  let joinedToPopulation = false;
  let lastWasPopulation = false;
  const read = readClauses(tokens, config, P, afterComma);
  if ('unreadAt' in read) {
    return null;
  }
  for (const match of read.matches) {
    if (match.joined) {
      joined ||= population;
      joinedToPopulation ||= lastWasPopulation;
    }
    const { clause } = match;
    // "women and children", or "women under 30 and children", asks about two populations, so it never
    // counts the girls they share. "women and under 5" may too, so any age right after one is refused.
    if ((joined && isPopulation(clause)) || (joinedToPopulation && clause.kind === 'age')) return null;
    lastWasPopulation = isPopulation(clause);
    population ||= lastWasPopulation;
    joinedToPopulation = false;
    if (clause.kind === 'gender' || (clause.kind === 'age' && clause.gender)) {
      if (gender && gender !== clause.gender) return null;
      gender = clause.gender;
    }
    if (clause.kind === 'age' && clause.group) {
      // Two named groups are likely an "or" or a slip, never the narrow band between them.
      if (banded) return null;
      banded = true;
      bandMin = Math.max(bandMin, clause.minAge ?? 0);
      bandMax = Math.min(bandMax, clause.maxAge ?? MAX_AGE);
    } else if (clause.kind === 'age') {
      if ((clause.minAge != null && minAge != null) || (clause.maxAge != null && maxAge != null)) return null;
      minAge = clause.minAge ?? minAge;
      maxAge = clause.maxAge ?? maxAge;
    } else if (clause.kind === 'program') {
      if (!programs.includes(clause.program)) programs.push(clause.program);
    } else if (clause.kind === 'drugGroup') {
      if (!drugGroups.includes(clause.group)) drugGroups.push(clause.group);
    } else if (clause.kind === 'encounter' && !encounterTypes.includes(clause.encounterType)) {
      encounterTypes.push(clause.encounterType);
    } else if (clause.kind === 'test') {
      tests.push(clause);
    }
  }

  if (!isAge(minAge) || !isAge(maxAge)) {
    return null;
  }
  if (banded) {
    // Within the band; a bound outside it, as in "adults under 10", leaves no one, so no cohort.
    minAge = Math.max(minAge ?? 0, bandMin);
    maxAge = Math.min(maxAge ?? MAX_AGE, bandMax);
    if (minAge === 0) minAge = undefined;
    if (maxAge === MAX_AGE) maxAge = undefined;
  }
  if (minAge != null && maxAge != null && minAge > maxAge) {
    return null;
  }
  // The cohort builder reads an age of 0 as "not set", so "under 1" (or "under 12 months") would become
  // everyone alive; it gives no row.
  if (maxAge === 0) {
    return null;
  }
  // "0+" on its own bounds nothing, so it isn't a criterion: "at least 0" alone offers no cohort.
  if (minAge === 0 && maxAge == null) {
    minAge = undefined;
  }
  if (![...programs, ...encounterTypes, ...tests.map(({ test }) => test)].every((item) => isUuid(item.uuid))) {
    return null;
  }
  // A group without Drug uuids (or with too many) can't become a drug order search, so nothing is offered.
  if (
    !drugGroups.every(
      (group) => group.drugUuids?.length && group.drugUuids.length <= MAX_DRUGS && group.drugUuids.every(isUuid),
    )
  ) {
    return null;
  }

  const criteria: Array<Criterion> = [];
  if (gender || minAge != null || maxAge != null) {
    criteria.push({
      type: 'demographics',
      gender: gender ?? 'any',
      ...(minAge != null && { minAge }),
      ...(maxAge != null && { maxAge }),
    });
  }
  for (const program of programs) {
    criteria.push({ type: 'enrollment', programs: [program.uuid] });
  }
  for (const group of drugGroups) {
    criteria.push({ type: 'drugOrder', drugs: [...group.drugUuids], activeOnOrAfter: 'today' });
  }
  for (const encounterType of encounterTypes) {
    criteria.push({ type: 'encounter', encounterTypes: [encounterType.uuid] });
  }
  for (const { test, operator, value, which, withinLastMonths, withinLastDays, onOrAfter } of tests) {
    criteria.push({
      type: 'numericObs',
      concept: test.uuid,
      operator,
      value,
      ...(which && { which }),
      ...(withinLastMonths && { withinLastMonths }),
      ...(withinLastDays && { withinLastDays }),
      ...(onOrAfter && { onOrAfter }),
    });
  }
  if (!criteria.length || criteria.length > MAX_CRITERIA) {
    return null;
  }

  const description = [
    gender ? `${gender} patients` : 'patients',
    describeAge(minAge, maxAge),
    ...programs.map((program) => `in ${program.label}`),
    ...drugGroups.map((group) => `on ${group.label}`),
    ...encounterTypes.map((encounterType) => `with ${encounterType.label} encounters`),
    ...tests.map(({ test, operator, value, which }) =>
      [`with ${resultWords[which ?? 'latest']} ${test.label}`, operatorSigns[operator], value, test.units]
        .filter(Boolean)
        .join(' '),
    ),
  ]
    .filter(Boolean)
    .join(' ');
  const label = (description.charAt(0).toUpperCase() + description.slice(1)).slice(0, MAX_LABEL_LENGTH);

  return { v: 1, label, criteria };
}
