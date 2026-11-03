import { useEffect, useState } from 'react';
import { getSessionStore, openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';
import { type CohortEncounterType, type CohortProgram } from '../config-schema';
import { isUuid } from '../url-definition/url-definition';
import { compilePhrases, tokenize } from './phrases/phrase-table';
import { isPlainObject } from './saved-search.resource';

/**
 * The programs and encounter types the server has, so the cohort parser knows them by name with no
 * config: a program by its name, its concept's names in the user's language and in English (CIEL
 * gives most programs several), and each of those without a trailing program word (any of the
 * table's `programNouns`: "program", "clinic", "service" and the rest); an encounter type by its name. Asked for once per user and language, when the bar first mounts the
 * count row, never per keystroke; the parser itself still makes no request.
 *
 * Limits: the first 100 of each (REST pages), and a concept's voided names too, since REST doesn't
 * say which names are voided. A user who may not read programs or encounter types gets config alone.
 */

export interface ServerVocabulary {
  programs: Array<CohortProgram>;
  encounterTypes: Array<CohortEncounterType>;
}

const empty: ServerVocabulary = { programs: [], encounterTypes: [] };
const maxEntries = 100;
const programsUrl = `${restBaseUrl}/program?v=custom:(uuid,name,retired,concept:(names:(name,locale)))&limit=${maxEntries}`;
// One program whose concept can't be read fails the whole list (o3's MDR-TB Program does), so names alone then.
const programNamesUrl = `${restBaseUrl}/program?v=custom:(uuid,name,retired)&limit=${maxEntries}`;
const encounterTypesUrl = `${restBaseUrl}/encountertype?v=custom:(uuid,name,retired)&limit=${maxEntries}`;
const maxNameLength = 120;

const nameOf = (value: unknown) =>
  typeof value === 'string' && value.trim() && value.length <= maxNameLength ? value.trim() : null;

/** "TB Program" also as "TB": a name without a trailing program word, when something is left. */
function withoutProgramWord(name: string, programWords: Array<string>): string | null {
  const words = name.split(/\s+/);
  const last = tokenize(words.at(-1) ?? '')?.join(' ');
  return words.length > 1 && programWords.includes(last) ? words.slice(0, -1).join(' ') : null;
}

/** Aliases in order, once each whatever their case, never repeating the label. */
function distinct(label: string, names: Array<string | null>): Array<string> {
  const seen = new Set([label.toLowerCase()]);
  return names.filter((name): name is string => {
    if (!name || seen.has(name.toLowerCase())) return false;
    seen.add(name.toLowerCase());
    return true;
  });
}

const entriesOf = (data: unknown) =>
  (isPlainObject(data) && Array.isArray(data.results) ? data.results : []).filter(
    (entry): entry is Record<string, unknown> =>
      isPlainObject(entry) && entry.retired !== true && isUuid(entry.uuid) && nameOf(entry.name) !== null,
  );

/** The answers read defensively: anything that isn't what the parser needs is left out. */
export function toServerVocabulary(programData: unknown, encounterTypeData: unknown, locale: string): ServerVocabulary {
  const language = (locale ?? 'en').split(/[-_]/)[0].toLowerCase();
  const programWords = compilePhrases().programNouns.map((noun) => noun.join(' '));
  const programs = entriesOf(programData).map((program) => {
    const label = nameOf(program.name);
    const conceptNames = (
      isPlainObject(program.concept) && Array.isArray(program.concept.names) ? program.concept.names : []
    )
      .filter((name) => isPlainObject(name) && typeof name.locale === 'string')
      .filter((name) => {
        const nameLanguage = String(name.locale).split(/[-_]/)[0].toLowerCase();
        return nameLanguage === language || nameLanguage === 'en';
      })
      .map((name) => nameOf(name.name))
      .filter(Boolean);
    return {
      uuid: program.uuid as string,
      label,
      aliases: distinct(label, [
        withoutProgramWord(label, programWords),
        ...conceptNames.flatMap((name) => [name, withoutProgramWord(name, programWords)]),
      ]),
    };
  });
  const encounterTypes = entriesOf(encounterTypeData).map((encounterType) => ({
    uuid: encounterType.uuid as string,
    label: nameOf(encounterType.name),
    aliases: [],
  }));
  return { programs, encounterTypes };
}

/**
 * Config first: its label for an item the server also has, with the server's names added as aliases.
 * Then everything else the server has.
 */
export function mergeVocabulary(
  configured: { programs: Array<CohortProgram>; encounterTypes?: Array<CohortEncounterType> },
  server: ServerVocabulary | null,
): ServerVocabulary {
  if (!server) return { programs: configured.programs ?? [], encounterTypes: configured.encounterTypes ?? [] };
  const merge = <T extends CohortProgram | CohortEncounterType>(mine: Array<T>, theirs: Array<T>): Array<T> => {
    const byUuid = new Map(theirs.map((item) => [item.uuid.toLowerCase(), item]));
    const merged = mine.map((item) => {
      const match = byUuid.get(item.uuid.toLowerCase());
      return match
        ? { ...item, aliases: distinct(item.label, [...item.aliases, match.label, ...match.aliases]) }
        : item;
    });
    const known = new Set(mine.map(({ uuid }) => uuid.toLowerCase()));
    return [...merged, ...theirs.filter(({ uuid }) => !known.has(uuid.toLowerCase()))];
  };
  return {
    programs: merge(configured.programs ?? [], server.programs),
    encounterTypes: merge(configured.encounterTypes ?? [], server.encounterTypes),
  };
}

const currentUser = (): string | undefined => getSessionStore().getState().session?.user?.uuid;

let cached: { key: string; read: Partial<ServerVocabulary>; asking?: Promise<Partial<ServerVocabulary>> } | null = null;
// Set once for the page's life: the subscription outlives forgetServerVocabulary, which resets only `cached`.
let following = false;

/**
 * Forgets the vocabulary as soon as the logged-in user changes or logs out, bar open or not: what one
 * user may read isn't kept for the next. Subscribed once, on first use.
 */
function followSession() {
  if (following) return;
  following = true;
  let user = currentUser();
  getSessionStore().subscribe(() => {
    const now = currentUser();
    if (now !== user) {
      user = now;
      cached = null;
    }
  });
}

/** For tests: whether a vocabulary is kept. */
export function hasServerVocabulary(): boolean {
  return Boolean(cached?.read.programs || cached?.read.encounterTypes);
}

/** For tests: forget what was fetched. */
export function forgetServerVocabulary() {
  cached = null;
}

/** Asks for the lists not read yet. One that fails is left out, to be asked for again next time. */
async function readVocabulary(locale: string, read: Partial<ServerVocabulary>): Promise<Partial<ServerVocabulary>> {
  const [programs, encounterTypes] = await Promise.allSettled([
    read.programs ??
      openmrsFetch<unknown>(programsUrl)
        .catch(() => openmrsFetch<unknown>(programNamesUrl))
        .then(({ data }) => toServerVocabulary(data, null, locale).programs),
    read.encounterTypes ??
      openmrsFetch<unknown>(encounterTypesUrl).then(
        ({ data }) => toServerVocabulary(null, data, locale).encounterTypes,
      ),
  ]);
  return {
    ...(programs.status === 'fulfilled' && { programs: programs.value }),
    ...(encounterTypes.status === 'fulfilled' && { encounterTypes: encounterTypes.value }),
  };
}

const isComplete = (read: Partial<ServerVocabulary> | undefined): read is ServerVocabulary =>
  Boolean(read?.programs && read.encounterTypes);

/**
 * The server's programs and encounter types for the logged-in user, or null until they arrive or
 * while `enabled` is false. A list that can't be read is empty, quietly, and the next mount asks for it
 * again; a list that was read is kept for the session.
 */
export function useServerVocabulary(enabled: boolean, locale: string): ServerVocabulary | null {
  const key = `${currentUser() ?? ''} ${locale}`;
  const [state, setState] = useState<{ key: string; value: ServerVocabulary } | null>(() =>
    enabled && cached?.key === key && isComplete(cached.read) ? { key, value: cached.read } : null,
  );

  useEffect(() => {
    if (!enabled) return;
    followSession();
    if (cached?.key !== key) cached = { key, read: {} };
    const entry = cached;
    if (isComplete(entry.read)) {
      setState({ key, value: entry.read });
      return;
    }
    if (!entry.asking) {
      entry.asking = readVocabulary(locale, entry.read).then((read) => {
        entry.read = read;
        entry.asking = undefined;
        return read;
      });
    }
    let live = true;
    entry.asking.then((read) => live && setState({ key, value: { ...empty, ...read } }));
    return () => {
      live = false;
    };
  }, [enabled, key, locale]);

  return enabled && state?.key === key ? state.value : null;
}
