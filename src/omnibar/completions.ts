import { type OmnibarCompletion } from './omnibar-contract';
import { type CohortCriteriaConfig, type CohortTest, typedProgramWords, typedTestWords } from './parse-cohort-criteria';

/**
 * What the count row offers to finish the question being typed, taken with Tab: the test whose
 * name is being typed, from what the concept lookup found for those words, and the program after
 * "enrolled in", from the programs the row already knows. Each completion replaces the words typed
 * so far with the whole name and a space, so the comparison can follow.
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

export function completionsFor(
  query: string,
  config: CohortCriteriaConfig,
  lookedUp: (words: string) => Array<CohortTest> | undefined,
): Array<OmnibarCompletion> {
  const completions: Array<OmnibarCompletion> = [];

  for (const words of typedProgramWords(query, config)) {
    const replace = typedLength(query, words);
    if (replace === null) continue;
    for (const program of config.programs ?? []) {
      const typed = words.toLowerCase();
      const name = [program.label, ...(program.aliases ?? [])].find((candidate) =>
        candidate.toLowerCase().startsWith(typed),
      );
      if (name && program.label.length <= maxName && !completions.some(({ label }) => label === program.label)) {
        completions.push({ insert: `${program.label} `, replace, label: program.label });
      }
    }
    if (completions.length) break;
  }

  const words = typedTestWords(query, config);
  const replace = words ? typedLength(query, words) : null;
  if (words && replace !== null) {
    for (const test of lookedUp(words) ?? []) {
      const name = nameFor(test, words);
      if (name && name.length <= maxName) {
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
