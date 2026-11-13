import { useEffect, useState } from 'react';
import { getSessionStore, openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';
import { isUuid } from '../url-definition/url-definition';
import { type CohortTest } from './parse-cohort-criteria';
import { isPlainObject } from './saved-search.resource';

/**
 * Tests by name, from the server's concept search: the numeric concepts whose names match the words
 * the cohort parser couldn't read ("viral load" in "patients with viral load over 1000"), each with
 * its name, its names in the user's language and English, and its units. Asked for once the words
 * have stayed the same for a moment, and remembered per user and language for the session. Only those
 * words are sent; the parser decides which words could be a test.
 */

export const testLookupDelayMs = 300;
const maxRemembered = 100;
const maxNameLength = 120;
const maxUnitsLength = 40;

const lookupUrl = (words: string) =>
  `${restBaseUrl}/concept?${new URLSearchParams({
    q: words,
    v: 'custom:(uuid,display,units,datatype:(hl7Abbreviation),names:(name,locale))',
    limit: '20',
  })}`;

const textOf = (value: unknown, max: number) =>
  typeof value === 'string' && value.trim() && value.length <= max ? value.trim() : null;

/** "Weight (kg)" as "Weight"; null when there is no bracketed end or nothing before it. */
function withoutBracketedEnd(name: string | null): string | null {
  const stripped = name?.replace(/\s*\([^()]*\)\s*$/, '').trim();
  return stripped && stripped !== name ? stripped : null;
}

/** The numeric concepts in a concept search answer, read defensively. */
export function toTests(data: unknown): Array<CohortTest> {
  const results = isPlainObject(data) && Array.isArray(data.results) ? data.results : [];
  return results.flatMap((concept) => {
    if (!isPlainObject(concept) || !isUuid(concept.uuid)) return [];
    if (!isPlainObject(concept.datatype) || concept.datatype.hl7Abbreviation !== 'NM') return [];
    const label = textOf(concept.display, maxNameLength);
    if (!label) return [];
    const names = (Array.isArray(concept.names) ? concept.names : [])
      .filter(isPlainObject)
      .map((name) => textOf(name.name, maxNameLength));
    const seen = new Set([label.toLowerCase()]);
    // Each name also without a trailing unit in brackets, as CIEL writes "Weight (kg)": the unit is
    // the concept's anyway, and checked against it.
    const aliases = [label, ...names]
      .flatMap((name) => [name, withoutBracketedEnd(name)])
      .filter((name): name is string => {
        if (!name || seen.has(name.toLowerCase())) return false;
        seen.add(name.toLowerCase());
        return true;
      });
    return [{ uuid: concept.uuid as string, label, aliases, units: textOf(concept.units, maxUnitsLength) ?? '' }];
  });
}

const currentUser = (): string | undefined => getSessionStore().getState().session?.user?.uuid;

const lookups = new Map<string, Array<CohortTest>>();
let lookupsUser: string | undefined;
// Set once for the page's life: it clears the lookups whenever the logged-in user changes.
let following = false;

function rememberedLookups() {
  if (!following) {
    following = true;
    lookupsUser = currentUser();
    getSessionStore().subscribe(() => {
      if (currentUser() !== lookupsUser) {
        lookupsUser = currentUser();
        lookups.clear();
      }
    });
  }
  if (currentUser() !== lookupsUser) {
    lookupsUser = currentUser();
    lookups.clear();
  }
  return lookups;
}

const keyOf = (words: string, locale: string) => `${locale} ${words.toLowerCase()}`;

/** The tests found for these words, or undefined when they haven't been looked up. */
export function knownTests(words: string, locale: string): Array<CohortTest> | undefined {
  return rememberedLookups().get(keyOf(words, locale));
}

/** For tests: forget every lookup. */
export function forgetTestLookups() {
  lookups.clear();
}

function remember(words: string, locale: string, tests: Array<CohortTest>, askedBy: string | undefined) {
  const remembered = rememberedLookups();
  if (askedBy !== lookupsUser) return;
  const key = keyOf(words, locale);
  remembered.delete(key);
  remembered.set(key, tests);
  if (remembered.size > maxRemembered) {
    remembered.delete(remembered.keys().next().value);
  }
}

/**
 * Looks the words up unless they already have been, and returns a number that changes whenever a
 * lookup lands, so a caller reading `knownTests` knows to read again. A failed lookup is forgotten,
 * so the same words are asked again on the next try.
 */
export function useTestLookup(words: string | null, enabled: boolean, locale: string, onLanded?: () => void): number {
  const [landed, setLanded] = useState(0);

  useEffect(() => {
    if (!enabled || !words || knownTests(words, locale) !== undefined) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      const askedBy = currentUser();
      openmrsFetch<unknown>(lookupUrl(words), { signal: controller.signal }).then(
        ({ data }) => {
          if (controller.signal.aborted) return;
          remember(words, locale, toTests(data), askedBy);
          setLanded((count) => count + 1);
          onLanded?.();
        },
        () => {
          // Nothing is remembered, so the next try asks again; the row meanwhile offers nothing.
        },
      );
    }, testLookupDelayMs);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [words, enabled, locale, onLanded]);

  return landed;
}
