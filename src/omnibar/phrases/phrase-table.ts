import english from './en.json';

/**
 * The words the cohort parser understands, as data. `en.json` is the shipped table; a site adds its
 * own phrases with the `omnibar.phrases` config, which can only add, never remove. Comparators are
 * named after the FHIR search prefixes: `under` is lt, `atMost` le, `over` gt, `atLeast` ge and
 * `aged` eq, each written before the number; `orUnder` (le) and `orOver` (ge) are written after it.
 */

export interface AgeGroup {
  phrases: Array<string>;
  minAge?: number;
  maxAge?: number;
  gender?: 'male' | 'female';
  /** Where the bounds come from, for the people who maintain the table. Not shown. */
  source?: string;
}

const phraseLists = [
  'stopwords',
  'female',
  'male',
  'under',
  'atMost',
  'over',
  'atLeast',
  'aged',
  'orUnder',
  'orOver',
  'rangeFrom',
  'rangeTo',
  'years',
  'yearsOld',
  'months',
  'otherUnits',
  'enrolled',
  'programLinkers',
  'programNouns',
  'drugVerbs',
  'encounterNouns',
] as const;

export type PhraseList = (typeof phraseLists)[number];

export type PhraseTable = Record<PhraseList, Array<string>> & {
  /** Words that are never stopwords: negations and alternatives, so "not on ARVs" is never "on ARVs". */
  never: Array<string>;
  /** Number words, read alone or as tens and units ("forty nine", "forty-nine"). */
  numbers: Record<string, number>;
  ageGroups: Array<AgeGroup>;
};

/** What a site adds in config: more phrases for any list, and more age groups. */
export type PhraseAdditions = Partial<Record<PhraseList, Array<string>>> & { ageGroups?: Array<AgeGroup> };

export const englishPhrases = english as PhraseTable;

/** Phrases as token sequences, longest first, so the longest phrase at a position wins. */
type Compiled = Array<Array<string>>;

export interface CompiledAgeGroup {
  tokens: Array<string>;
  minAge?: number;
  maxAge?: number;
  gender?: 'male' | 'female';
}

export type CompiledPhrases = Record<PhraseList, Compiled> & {
  never: Set<string>;
  numbers: Map<string, number>;
  ageGroups: Array<CompiledAgeGroup>;
  /** Every word in the table, which a misspelt name is never matched against. */
  knownWords: Set<string>;
};

/**
 * Lower case, one token per word, and the comparison signs, plus, slash and dashes as tokens of their
 * own. Apostrophes go ("women's" is "womens"), as do the punctuation marks people end questions with,
 * and commas and semicolons too unless `commas` keeps them, both as "," tokens, as the parser does to
 * read them as joiners.
 * Null for any character a question about a cohort never needs, so it is never read.
 */
export function tokenize(text: string, commas = false): Array<string> | null {
  const normalized = text
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[’'`]/g, '')
    .replace(/[–—−]/g, '-')
    .replace(/≤/g, '<=')
    .replace(/≥/g, '>=')
    .replace(/;/g, ',')
    .replace(commas ? /[.:!?()"]/g : /[,.:!?()"]/g, ' ')
    .replace(/(<=|>=|=<|=>|<|>|=|\+|-|\/|,)/g, ' $1 ')
    // "30y", "15yo", "u5": numbers and words apart.
    .replace(/(\d)(\p{L})/gu, '$1 $2')
    .replace(/(\p{L})(\d)/gu, '$1 $2');
  if (!/^[\p{L}\p{M}\d+<>=/\s,-]*$/u.test(normalized)) {
    return null;
  }
  return normalized
    .split(/\s+/)
    .filter(Boolean)
    .map((token) => token.replace(/^(<=|>=|=<|=>)$/, (sign) => ({ '=<': '<=', '=>': '>=' }[sign] ?? sign)));
}

const maxPhraseLength = 80;

function compileList(phrases: Array<unknown>): Compiled {
  const seen = new Set<string>();
  const compiled: Compiled = [];
  for (const phrase of phrases) {
    if (typeof phrase !== 'string' || phrase.length > maxPhraseLength) continue;
    const tokens = tokenize(phrase);
    const key = tokens?.join(' ');
    if (!tokens?.length || seen.has(key)) continue;
    seen.add(key);
    compiled.push(tokens);
  }
  return compiled.sort((a, b) => b.length - a.length);
}

const isAgeBound = (value: unknown) =>
  value === undefined || (typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 150);

function compileAgeGroups(groups: Array<unknown>): Array<CompiledAgeGroup> {
  const compiled: Array<CompiledAgeGroup> = [];
  for (const group of groups) {
    const { phrases, minAge, maxAge, gender } = (group ?? {}) as AgeGroup;
    if (
      !Array.isArray(phrases) ||
      !isAgeBound(minAge) ||
      !isAgeBound(maxAge) ||
      (minAge === undefined && maxAge === undefined) ||
      (minAge !== undefined && maxAge !== undefined && minAge > maxAge) ||
      (gender !== undefined && gender !== 'male' && gender !== 'female')
    ) {
      continue;
    }
    for (const tokens of compileList(phrases)) {
      compiled.push({
        tokens,
        ...(minAge !== undefined && { minAge }),
        ...(maxAge !== undefined && { maxAge }),
        ...(gender && { gender }),
      });
    }
  }
  return compiled.sort((a, b) => b.tokens.length - a.tokens.length);
}

const cache = new WeakMap<PhraseTable, WeakMap<object, CompiledPhrases>>();
const noAdditions = {};

/**
 * The table ready to match, with a site's additions. Anything malformed in the additions is left out
 * rather than failing: an added phrase, or added age group phrase, holding a word from `never`, in any
 * list, so a site can't make a negation or an alternative read as part of a criterion; a phrase that isn't
 * text, is longer than 80 characters or has a character the parser never reads; an age group without
 * whole-number bounds from 0 to 150 in order. Memoized per table and additions object.
 */
export function compilePhrases(
  table: PhraseTable = englishPhrases,
  additions: PhraseAdditions = noAdditions,
): CompiledPhrases {
  const byAdditions = cache.get(table) ?? new WeakMap<object, CompiledPhrases>();
  cache.set(table, byAdditions);
  const cached = byAdditions.get(additions);
  if (cached) return cached;

  const never = new Set(table.never.flatMap((word) => tokenize(word) ?? []));
  const holdsNever = (phrase: unknown) =>
    typeof phrase !== 'string' || (tokenize(phrase) ?? []).some((token) => never.has(token));
  const lists = Object.fromEntries(
    phraseLists.map((list) => {
      const added = (Array.isArray(additions[list]) ? additions[list] : []).filter((phrase) => !holdsNever(phrase));
      return [list, compileList([...table[list], ...added])];
    }),
  ) as Record<PhraseList, Compiled>;
  // The shipped table may hold reviewed phrases such as "not older than"; a stopword never may, since
  // it is skipped wherever it stands.
  lists.stopwords = lists.stopwords.filter((tokens) => !tokens.some((token) => never.has(token)));

  const numbers = new Map(
    Object.entries(table.numbers).filter(([word, value]) => /^\p{L}+$/u.test(word) && Number.isInteger(value)),
  );
  const ageGroups = compileAgeGroups([
    ...table.ageGroups,
    ...(Array.isArray(additions.ageGroups) ? additions.ageGroups : []).map((group) => ({
      ...group,
      phrases: Array.isArray(group?.phrases) ? group.phrases.filter((phrase) => !holdsNever(phrase)) : [],
    })),
  ]);
  const knownWords = new Set([
    ...Object.values(lists).flatMap((compiled) => compiled.flat()),
    ...ageGroups.flatMap(({ tokens }) => tokens),
    ...numbers.keys(),
    ...never,
  ]);

  const compiled: CompiledPhrases = { ...lists, never, numbers, ageGroups, knownWords };
  byAdditions.set(additions, compiled);
  return compiled;
}

/** The end of the longest phrase of `phrases` starting at `start`, or null. */
export function matchPhrase(tokens: Array<string>, start: number, phrases: Compiled): number | null {
  for (const phrase of phrases) {
    if (phrase.every((token, offset) => tokens[start + offset] === token)) {
      return start + phrase.length;
    }
  }
  return null;
}
