import { execSync } from 'node:child_process';
import { copyFileSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import packageJson from '../../package.json';
import en from '../../translations/en.json';

/** What `yarn extract-translations` would write over translations/en.json, run on a copy of it. */
function extractTranslations(): string {
  const dir = mkdtempSync(join(tmpdir(), 'translations-'));
  try {
    copyFileSync('translations/en.json', join(dir, 'en.json'));
    const script = packageJson.scripts['extract-translations'].replace(/^i18next /, 'node_modules/.bin/i18next ');
    execSync(`${script} --silent --output '${dir}/$LOCALE.json'`);
    return readFileSync(join(dir, 'en.json'), 'utf8');
  } finally {
    rmSync(dir, { recursive: true });
  }
}

describe('omnibar translations', () => {
  it('has every key the providers and the contract boundary use, with its English text', () => {
    expect(en).toMatchObject({
      cohortBuilder: 'Cohort Builder',
      cohortBuilderSubtitle: 'Find patients by age, gender, program, drug orders and more',
      cohortMemberCount_one: '{{count}} member',
      cohortMemberCount_other: '{{count}} members',
      omnibarCohortCount: 'Patient count',
      omnibarCohortCountPatients_one: '{{formattedCount}} patient',
      omnibarCohortCountPatients_other: '{{formattedCount}} patients',
      // Nested, as the omnibar reads them: omnibarCommand.<id>.aliases, .label and .description.
      omnibarCommand: {
        cohort: {
          aliases: 'cohort, count',
          description: 'Count patients by age, gender, program or encounter type',
          label: 'Cohorts',
        },
      },
      omnibarCohorts: 'Cohorts',
      omnibarCounting: 'Counting…',
      omnibarSavedCohorts: 'Saved cohorts',
      omnibarSavedQueries: 'Saved queries',
      openInCohortBuilder: 'Open in the Cohort Builder',
      results: 'Results',
      runInCohortBuilder: 'Run in the Cohort Builder',
    });
  });

  it('comes out of extract-translations unchanged, keeping the command strings only the omnibar reads', () => {
    expect(extractTranslations()).toBe(readFileSync('translations/en.json', 'utf8'));
  }, 30_000);
});
