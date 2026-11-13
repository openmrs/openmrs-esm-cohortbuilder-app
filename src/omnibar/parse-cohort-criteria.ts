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
} from '../url-definition/url-definition';

/**
 * Turns plain English like "women aged 15-49 on ARVs" into a cohort builder definition, from config
 * alone. Every word must be understood or be a stopword; anything else returns null, so the omnibar
 * never shows a cohort that is a guess at what was typed. No network, no model. The limits and the
 * uuid check are the decoder's own, in url-definition.ts.
 */

export interface CohortCriteriaConfig {
  /** When false, drug groups are unknown words, so "on ARVs" makes the whole text unparseable. */
  drugCriteriaEnabled: boolean;
  programs: Array<CohortProgram>;
  drugGroups: Array<CohortDrugGroup>;
  /** Encounter types read as "<alias> encounter". None configured, none understood. */
  encounterTypes?: Array<CohortEncounterType>;
}

/** drugCriteriaEnabled says what the server can run, so it sits at the top of the config. */
export function cohortCriteriaConfig(config: ConfigObject): CohortCriteriaConfig {
  return {
    drugCriteriaEnabled: config.drugCriteriaEnabled,
    programs: config.omnibar.programs,
    drugGroups: config.omnibar.drugGroups,
    encounterTypes: config.omnibar.encounterTypes,
  };
}

const STOPWORDS = new Set([
  'a',
  'all',
  'an',
  'and',
  'are',
  'build',
  'cohort',
  'count',
  'currently',
  'everyone',
  'find',
  'for',
  'get',
  'had',
  'has',
  'have',
  'having',
  'how',
  'is',
  'list',
  'many',
  'me',
  'number',
  'of',
  'patient',
  'patients',
  'people',
  'person',
  'persons',
  'search',
  'show',
  'that',
  'the',
  'there',
  'those',
  'total',
  'were',
  'what',
  'who',
  'whose',
  'with',
]);

const GENDERS: Record<string, 'male' | 'female'> = {
  female: 'female',
  females: 'female',
  girl: 'female',
  girls: 'female',
  woman: 'female',
  women: 'female',
  male: 'male',
  males: 'male',
  boy: 'male',
  boys: 'male',
  man: 'male',
  men: 'male',
};

const ENROLLED_WORDS = new Set(['enrolled', 'enroled', 'enrollment', 'enrolment']);
const PROGRAM_WORDS = new Set(['program', 'programs', 'programme', 'programmes']);
const DRUG_VERBS = new Set(['on', 'taking', 'receiving']);
const ENCOUNTER_WORDS = new Set(['encounter', 'encounters']);

type Clause =
  | { kind: 'gender'; gender: 'male' | 'female' }
  | { kind: 'age'; minAge?: number; maxAge?: number }
  | { kind: 'program'; program: CohortProgram }
  | { kind: 'drugGroup'; group: CohortDrugGroup }
  | { kind: 'encounter'; encounterType: CohortEncounterType };

interface Match {
  next: number;
  clause: Clause;
}

/** Lower case, dashes and plus signs as their own tokens, and null for characters we never parse. */
function tokenize(text: string): Array<string> | null {
  const normalized = text
    .toLowerCase()
    .replace(/[–—]/g, '-')
    .replace(/[,.;:!?]/g, ' ')
    .replace(/([+-])/g, ' $1 ');
  if (!/^[a-z0-9+\s-]*$/.test(normalized)) {
    return null;
  }
  return normalized.split(/\s+/).filter(Boolean);
}

const N = '(\\d{1,3})';
const YEARS = '(?: (?:years?|yrs?)(?: old)?)?';
const AGE_PREFIX = '(?:(?:aged|age|ages) )?';

/** Tried in order at each position; each returns the bounds, inclusive, for its captured numbers. */
const AGE_PATTERNS: Array<{ pattern: RegExp; bounds: (a: number, b: number) => { minAge?: number; maxAge?: number } }> =
  [
    { pattern: `between ${N}${YEARS} and ${N}${YEARS}`, bounds: (a, b) => ({ minAge: a, maxAge: b }) },
    { pattern: `${N}${YEARS} (?:-|to) ${N}${YEARS}`, bounds: (a, b) => ({ minAge: a, maxAge: b }) },
    { pattern: `(?:over|above|older than|more than) ${N}${YEARS}`, bounds: (a) => ({ minAge: a + 1 }) },
    { pattern: `(?:under|below|younger than|less than) ${N}${YEARS}`, bounds: (a) => ({ maxAge: a - 1 }) },
    { pattern: `at least ${N}${YEARS}`, bounds: (a) => ({ minAge: a }) },
    { pattern: `at most ${N}${YEARS}`, bounds: (a) => ({ maxAge: a }) },
    { pattern: `${N}${YEARS} \\+`, bounds: (a) => ({ minAge: a }) },
    { pattern: `${N}${YEARS} (?:and|or) (?:over|older|above)`, bounds: (a) => ({ minAge: a }) },
    { pattern: `${N}${YEARS} (?:and|or) (?:under|younger|below)`, bounds: (a) => ({ maxAge: a }) },
    { pattern: `${N} (?:years?|yrs?) old`, bounds: (a) => ({ minAge: a, maxAge: a }) },
  ].map(({ pattern, bounds }) => ({ pattern: new RegExp(`^${AGE_PREFIX}${pattern}(?= |$)`), bounds }));

const EXACT_AGE = new RegExp(`^(?:aged|age) ${N}${YEARS}(?= |$)`);

function matchAge(tokens: Array<string>, start: number): Match | null {
  const rest = tokens.slice(start).join(' ');
  for (const { pattern, bounds } of AGE_PATTERNS) {
    const match = pattern.exec(rest);
    if (match) {
      const clause = { kind: 'age' as const, ...bounds(Number(match[1]), Number(match[2])) };
      return { next: start + match[0].split(' ').length, clause };
    }
  }
  const exact = EXACT_AGE.exec(rest);
  if (exact) {
    const age = Number(exact[1]);
    return { next: start + exact[0].split(' ').length, clause: { kind: 'age', minAge: age, maxAge: age } };
  }
  return null;
}

function matchGender(tokens: Array<string>, start: number): Match | null {
  const gender = GENDERS[tokens[start]];
  return gender ? { next: start + 1, clause: { kind: 'gender', gender } } : null;
}

/** The configured item whose label or alias matches the most tokens from `start`. */
function longestAlias<T extends { label: string; aliases: Array<string> }>(
  tokens: Array<string>,
  start: number,
  items: Array<T>,
): { item: T; next: number } | null {
  let best: { item: T; next: number } | null = null;
  for (const item of items) {
    for (const name of [item.label, ...item.aliases]) {
      const nameTokens = tokenize(name ?? '');
      if (!nameTokens?.length) continue;
      const matches = nameTokens.every((token, offset) => tokens[start + offset] === token);
      const next = start + nameTokens.length;
      if (matches && (!best || next > best.next)) {
        best = { item, next };
      }
    }
  }
  return best;
}

/** "enrolled in HIV", "in the TB program", "HIV programme". A bare "in HIV" is too vague. */
function matchProgram(tokens: Array<string>, start: number, programs: Array<CohortProgram>): Match | null {
  let i = start;
  const enrolled = ENROLLED_WORDS.has(tokens[i]);
  if (enrolled) i++;
  if (tokens[i] === 'in') i++;
  if (tokens[i] === 'the') i++;
  const hit = longestAlias(tokens, i, programs);
  if (!hit) return null;
  i = hit.next;
  // The matched name may already end in "program", as a label like "TB Program" does.
  let named = PROGRAM_WORDS.has(tokens[i - 1]);
  if (PROGRAM_WORDS.has(tokens[i])) {
    named = true;
    i++;
  }
  if (!enrolled && !named) return null;
  return { next: i, clause: { kind: 'program', program: hit.item } };
}

/** "on ARVs", "taking antiretrovirals", "receiving TLD". */
function matchDrugGroup(tokens: Array<string>, start: number, drugGroups: Array<CohortDrugGroup>): Match | null {
  if (!DRUG_VERBS.has(tokens[start])) return null;
  const hit = longestAlias(tokens, start + 1, drugGroups);
  return hit ? { next: hit.next, clause: { kind: 'drugGroup', group: hit.item } } : null;
}

/** "admission encounter", "vital signs encounters". The word "encounter" is required: "admission" alone is too vague. */
function matchEncounter(
  tokens: Array<string>,
  start: number,
  encounterTypes: Array<CohortEncounterType>,
): Match | null {
  const hit = longestAlias(tokens, start, encounterTypes);
  if (!hit || !ENCOUNTER_WORDS.has(tokens[hit.next])) return null;
  return { next: hit.next + 1, clause: { kind: 'encounter', encounterType: hit.item } };
}

function describeAge(minAge?: number, maxAge?: number): string | null {
  if (minAge != null && maxAge != null) return minAge === maxAge ? `aged ${minAge}` : `aged ${minAge}–${maxAge}`;
  if (minAge != null) return `aged ${minAge}+`;
  if (maxAge != null) return `aged ${maxAge} or younger`;
  return null;
}

const isAge = (value: number | undefined) =>
  value == null || (Number.isInteger(value) && value >= 0 && value <= MAX_AGE);

export function parseCohortCriteria(text: string, config: CohortCriteriaConfig): CohortDefinition | null {
  const tokens = tokenize(text);
  // A cohort needs at least one word: "50+" or "15-49" on their own could be anything.
  if (!tokens?.some((token) => /[a-z]/.test(token))) {
    return null;
  }

  let gender: 'male' | 'female' | undefined;
  let minAge: number | undefined;
  let maxAge: number | undefined;
  const programs: Array<CohortProgram> = [];
  const drugGroups: Array<CohortDrugGroup> = [];
  const encounterTypes: Array<CohortEncounterType> = [];

  const configuredDrugGroups = config.drugCriteriaEnabled ? config.drugGroups ?? [] : [];

  let i = 0;
  while (i < tokens.length) {
    if (STOPWORDS.has(tokens[i])) {
      i++;
      continue;
    }
    const match =
      matchGender(tokens, i) ??
      matchAge(tokens, i) ??
      matchProgram(tokens, i, config.programs ?? []) ??
      matchDrugGroup(tokens, i, configuredDrugGroups) ??
      matchEncounter(tokens, i, config.encounterTypes ?? []);
    if (!match) return null;

    const { clause } = match;
    if (clause.kind === 'gender') {
      if (gender && gender !== clause.gender) return null;
      gender = clause.gender;
    } else if (clause.kind === 'age') {
      if ((clause.minAge != null && minAge != null) || (clause.maxAge != null && maxAge != null)) return null;
      minAge = clause.minAge ?? minAge;
      maxAge = clause.maxAge ?? maxAge;
    } else if (clause.kind === 'program') {
      if (!programs.includes(clause.program)) programs.push(clause.program);
    } else if (clause.kind === 'drugGroup') {
      if (!drugGroups.includes(clause.group)) drugGroups.push(clause.group);
    } else if (!encounterTypes.includes(clause.encounterType)) {
      encounterTypes.push(clause.encounterType);
    }
    i = match.next;
  }

  if (!isAge(minAge) || !isAge(maxAge) || (minAge != null && maxAge != null && minAge > maxAge)) {
    return null;
  }
  // The cohort builder reads an age of 0 as "not set", so "under 1" would become everyone alive.
  if (maxAge === 0) {
    return null;
  }
  // "0+" on its own bounds nothing, so it isn't a criterion: "at least 0" alone offers no cohort.
  if (minAge === 0 && maxAge == null) {
    minAge = undefined;
  }
  if (![...programs, ...encounterTypes].every((item) => isUuid(item.uuid))) {
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
  if (!criteria.length || criteria.length > MAX_CRITERIA) {
    return null;
  }

  const description = [
    gender ? `${gender} patients` : 'patients',
    describeAge(minAge, maxAge),
    ...programs.map((program) => `in ${program.label}`),
    ...drugGroups.map((group) => `on ${group.label}`),
    ...encounterTypes.map((encounterType) => `with ${encounterType.label} encounters`),
  ]
    .filter(Boolean)
    .join(' ');
  const label = (description.charAt(0).toUpperCase() + description.slice(1)).slice(0, MAX_LABEL_LENGTH);

  return { v: 1, label, criteria };
}
