import { type OmnibarCompletion } from './omnibar-contract';
import {
  type CohortCriteriaConfig,
  type CohortTest,
  parseCohortCriteria,
  typedTestWords,
} from './parse-cohort-criteria';

/**
 * What the count row offers to finish the question being typed, taken with Tab: the test whose
 * name is being typed, from what the concept lookup found for those words. Each completion replaces
 * the words typed so far with the whole name and a space, so the comparison can follow.
 */

const maxCompletions = 5;
// The contract's limit for an insert is 120 characters, and each name gets a trailing space.
const maxName = 119;

/** The end of `query` that holds `words`, whatever the spacing and case: how much a completion replaces. */
function typedLength(query: string, words: string): number | null {
  const pattern = words
    .split(' ')
    .map((word) => word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('\\s*');
  const match = new RegExp(`${pattern}\\s*$`, 'iu').exec(query.normalize('NFKC'));
  // NFKC can change the text's length, and then the match's length isn't a count of what was typed.
  return match && query.normalize('NFKC').length === query.length ? match[0].length : null;
}

/** User's locale, then its language ("en" for "en_GB"), then English. Other locales are never offered. */
function localeOrder(userLocale: string): Array<string> {
  const locale = userLocale.replace(/-/g, '_').toLowerCase();
  const language = locale.split('_')[0];
  const order = [locale];
  if (language !== locale) order.push(language);
  if (!order.includes('en')) order.push('en');
  return order;
}

/** Names completions may offer, in locale order. Without locales, the label and aliases, as before. */
function namesToOffer(test: CohortTest, userLocale: string): Array<string> {
  const localized = test.localizedNames;
  if (!localized?.length) return [test.label, ...test.aliases];
  const names: Array<string> = [];
  for (const locale of localeOrder(userLocale)) {
    for (const entry of localized) {
      if (entry.locale.replace(/-/g, '_').toLowerCase() !== locale) continue;
      if (names.some((name) => name.toLowerCase() === entry.name.toLowerCase())) continue;
      names.push(entry.name);
    }
  }
  return names;
}

/**
 * Names that start the way the typed words do, then names that contain them. A result word before
 * the typed words ("mean" in "mean corp") prefers a name that begins with both.
 */
function namesMatching(names: Array<string>, words: string, lead: string | null): Array<string> {
  const typed = words.toLowerCase();
  const covering =
    lead === null ? [] : names.filter((name) => nameStartsWith(name, `${lead} ${words}`));
  const starting = names.filter(
    (name) => !covering.includes(name) && name.toLowerCase().startsWith(typed),
  );
  const containing = names.filter(
    (name) => !covering.includes(name) && !starting.includes(name) && name.toLowerCase().includes(typed),
  );
  return [...covering, ...starting, ...containing];
}

/** The completed question plus a comparison reads back as this test, and no other. */
function readsBackAs(
  query: string,
  name: string,
  replace: number,
  test: CohortTest,
  config: CohortCriteriaConfig,
  tests: Array<CohortTest>,
): boolean {
  const completed = `${query.slice(0, query.length - replace) + name} over 1`;
  const parsed = parseCohortCriteria(completed, { ...config, tests });
  const obs = parsed?.criteria.filter((criterion) => criterion.type === 'numericObs') ?? [];
  return obs.length === 1 && obs[0].concept === test.uuid;
}

/** True when `lead` is the first word or words of `name`, not merely a prefix of its first word. */
function nameStartsWith(name: string, lead: string): boolean {
  const text = name.toLowerCase();
  const typed = lead.toLowerCase();
  return text.startsWith(typed) && (text.length === typed.length || text.charAt(typed.length) === ' ');
}

export function completionsFor(
  query: string,
  config: CohortCriteriaConfig,
  lookedUp: (words: string) => Array<CohortTest> | undefined,
  locale = 'en',
): Array<OmnibarCompletion> {
  const completions: Array<OmnibarCompletion> = [];
  const typed = typedTestWords(query, config);
  if (typed) {
    const tests = lookedUp(typed.words) ?? [];
    for (const test of tests) {
      const names = namesMatching(namesToOffer(test, locale), typed.words, typed.lead);
      for (const name of names) {
        const fromLead = Boolean(typed.lead && nameStartsWith(name, typed.lead));
        const replace = typedLength(query, fromLead ? `${typed.lead} ${typed.words}` : typed.words);
        if (replace === null || name.length > maxName) continue;
        if (!readsBackAs(query, name, replace, test, config, tests)) continue;
        completions.push({
          insert: `${name} `,
          replace,
          label: name,
          detail: [test.label, test.units].filter(Boolean).join(' · '),
        });
        break;
      }
    }
  }

  return completions.slice(0, maxCompletions);
}
