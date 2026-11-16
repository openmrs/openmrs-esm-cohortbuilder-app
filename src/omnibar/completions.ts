import { type OmnibarCompletion } from './omnibar-contract';
import { type CohortCriteriaConfig, type CohortTest, typedTestWords } from './parse-cohort-criteria';

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

/** The first of the names that starts with the words, the label first; else the label, if it holds them. */
function nameFor({ label, aliases }: { label: string; aliases: Array<string> }, words: string): string | null {
  const typed = words.toLowerCase();
  const starting = [label, ...aliases].find((name) => name.toLowerCase().startsWith(typed));
  return starting ?? (label.toLowerCase().includes(typed) ? label : null);
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
): Array<OmnibarCompletion> {
  const completions: Array<OmnibarCompletion> = [];
  const typed = typedTestWords(query, config);
  if (typed) {
    for (const test of lookedUp(typed.words) ?? []) {
      const covering =
        typed.lead &&
        [test.label, ...test.aliases].find((name) => nameStartsWith(name, `${typed.lead} ${typed.words}`));
      const name = covering ?? nameFor(test, typed.words);
      const fromLead = Boolean(covering || (typed.lead && name && nameStartsWith(name, typed.lead)));
      const replace = name ? typedLength(query, fromLead ? `${typed.lead} ${typed.words}` : typed.words) : null;
      if (name && replace !== null && name.length <= maxName) {
        completions.push({
          insert: `${name} `,
          replace,
          label: name,
          detail: [test.label, test.units].filter(Boolean).join(' · '),
        });
      }
    }
  }

  return completions.slice(0, maxCompletions);
}
