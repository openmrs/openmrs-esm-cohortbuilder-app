import { describe, expect, it } from 'vitest';
import { completionsFor } from './completions';
import { type CohortCriteriaConfig, type CohortTest, parseCohortCriteria } from './parse-cohort-criteria';

/**
 * The sentences from the second review, plus nearby ones that should still read and ones that
 * should still give no row. The seen text is the cohort label, "no row", or the completion Tab would take.
 */

const hiv = '64f950e6-1b07-4ac0-8e7e-f3e148f3463f';
const tb = '9f144a34-3a4a-44a9-8486-6b7af6cc64f6';
const pmtct = 'd1b6cd43-8ac7-4cdd-8fb4-fe51635c82b4';
const admission = 'e22e39fd-7db2-45e7-80f1-60fa0d5a4378';
const order = '5d2e3f40-1111-4222-8333-444455556666';
const tdf = '0b8c3c4e-2f9a-4b1e-9d5c-1a2b3c4d5e6f';
const viralLoad = '856AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
const cd4 = '5497AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
const glu = '887AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
const glucose = '1458AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
const sodium = '1132AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';

const config: CohortCriteriaConfig = {
  drugCriteriaEnabled: true,
  programs: [
    { uuid: hiv, label: 'HIV Care and Treatment', aliases: ['hiv', 'hiv care', 'art'] },
    { uuid: tb, label: 'Tuberculosis Program', aliases: ['tb', 'tuberculosis'] },
    { uuid: pmtct, label: 'PMTCT', aliases: ['pmtct'] },
  ],
  drugGroups: [
    { id: 'arv', label: 'ARVs', aliases: ['arv', 'arvs', 'antiretrovirals'], drugUuids: [tdf], cielConceptUuids: [] },
  ],
  encounterTypes: [
    { uuid: admission, label: 'Admission', aliases: ['admission', 'inpatient admission'] },
    { uuid: order, label: 'Order', aliases: [] },
  ],
  tests: [
    { uuid: viralLoad, label: 'HIV viral load', aliases: ['viral load'], units: 'copies/mL' },
  ],
};

const seen = (text: string) => parseCohortCriteria(text, config)?.label ?? 'no row';

const rows: Array<[string, string]> = [
  ['adults 15+', 'no row'],
  ['pediatric patients under 18', 'no row'],
  ['adults under 10', 'no row'],
  ['children aged 10 to 30', 'no row'],
  ['children of women enrolled in PMTCT', 'no row'],
  ['women whose children are under 5', 'no row'],
  ['women of 15-49 years', 'Female patients aged 15–49'],
  ['patients with children', 'Patients aged 17 or younger'],
  ['patients enrolled in HIV for at least 12 months', 'no row'],
  ['patients with more than one admission encounter', 'no row'],
  ['how many admission encounters today', 'no row'],
  ['patients currently enrolled in TB', 'no row'],
  ['how many of my patients are women', 'no row'],
  ['how many patients do I have on ARVs', 'no row'],
  ['how many women are here', 'no row'],
  ['can I see all women on ARVs', 'Female patients on ARVs'],
  ['enrolled in hpv', 'no row'],
  ['enrolled in pmtc', 'no row'],
  ['patients with an older encounter', 'no row'],
  ['women 15-49 on ARVs', 'Female patients aged 15–49 on ARVs'],
  // A bare "in HIV" is already too vague. "enrolled" or "program" is what reads.
  ['children under 5 in HIV', 'no row'],
  ['children under 5 enrolled in HIV', 'Patients aged 4 or younger in HIV Care and Treatment'],
  ['children under 5 in the HIV program', 'Patients aged 4 or younger in HIV Care and Treatment'],
  ['men over 50 with an admission encounter', 'Male patients aged 51+ with Admission encounters'],
  ['patients on ARVs today', 'Patients on ARVs'],
  ['how many women do we have', 'Female patients'],
  ['mothers of children under 5', 'no row'],
  ['women having children', 'no row'],
  ['patients in TB for 6 months', 'no row'],
  ['2 or more admission encounters', 'no row'],
  ['patients currently on ARVs', 'Patients on ARVs'],
  ['show me women over 50', 'Female patients aged 51+'],
  ['patients with a viral load over 1000', 'Patients with most recent HIV viral load > 1000 copies/mL'],
  ['viral load over 1000 today', 'no row'],
  ['children under 5', 'Patients aged 4 or younger'],
  ['adults over 50', 'Patients aged 51+'],
  ['women over 50 with an admission encounter', 'Female patients aged 51+ with Admission encounters'],
  ['patients under 5 enrolled in HIV', 'Patients aged 4 or younger in HIV Care and Treatment'],
  ['men aged 15 to 49', 'Male patients aged 15–49'],
  ['how many women today', 'Female patients'],
  ['children under 5 right now', 'Patients aged 4 or younger'],
  ['on ARVs for 6 months', 'no row'],
  ['enrolled in HIV for 2 years', 'no row'],
  ['patients in TB for over a year', 'no row'],
  ['at least 2 admission encounters', 'no row'],
  ['women who have children', 'no row'],
  ['paediatric patients under 18', 'no row'],
  ['at least 2 HIV programs', 'no row'],
  ['more than one HIV program', 'no row'],
  ['more than one of the admission encounters', 'no row'],
  ['patients under 5 who had an admission encounter', 'Patients aged 4 or younger with Admission encounters'],
  ['can you show me women on ARVs', 'Female patients on ARVs'],
];

describe('the second review, as the row would show it', () => {
  it.each(rows)('%s → %s', (text, label) => {
    expect(seen(text)).toBe(label);
  });

  const cd4Test: CohortTest = {
    uuid: cd4,
    label: 'CD4%',
    aliases: ['CD4 count', 'CD4', 'CD4%'],
    units: 'cells/uL',
    localizedNames: [
      { name: 'CD4%', locale: 'en' },
      { name: 'CD4 count', locale: 'en' },
      { name: 'CD4', locale: 'en' },
    ],
  };
  const gluTest: CohortTest = {
    uuid: glu,
    label: 'Glu',
    aliases: ['Glu'],
    units: 'mg/dL',
    localizedNames: [{ name: 'Glu', locale: 'en' }],
  };
  const glucoseTest: CohortTest = {
    uuid: glucose,
    label: 'Glu',
    aliases: ['Glu'],
    units: 'mmol/L',
    localizedNames: [{ name: 'Glu', locale: 'en' }],
  };
  const creole: CohortTest = {
    uuid: sodium,
    label: 'Sodyòm sewòm',
    aliases: ['Sodyòm sewòm'],
    units: 'mmol/L',
    localizedNames: [{ name: 'Sodyòm sewòm', locale: 'ht' }],
  };
  const mcv: CohortTest = {
    uuid: '851AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    label: 'Mean corpuscular volume',
    aliases: ['Mcv'],
    units: 'fL',
    localizedNames: [
      { name: 'Mean corpuscular volume', locale: 'en' },
      { name: 'Mcv', locale: 'en' },
    ],
  };
  const viral: CohortTest = {
    uuid: viralLoad,
    label: 'HIV viral load',
    aliases: ['Viral load'],
    units: 'copies/mL',
    localizedNames: [
      { name: 'HIV viral load', locale: 'en' },
      { name: 'Viral load', locale: 'en' },
    ],
  };

  const taken = (text: string, tests: Array<CohortTest>, locale = 'en') => {
    const [completion] = completionsFor(text, { ...config, tests }, () => tests, locale);
    return completion ? `${text.slice(0, text.length - completion.replace)}${completion.insert}` : 'no completion';
  };

  it.each([
    ['women with vir', [viral], 'women with Viral load '],
    ['women with mean corp', [mcv], 'women with Mean corpuscular volume '],
    ['women with cd4', [cd4Test], 'women with CD4 count '],
    ['cd4', [cd4Test], 'no completion'],
    ['women with glu', [gluTest, glucoseTest], 'no completion'],
    ['glu', [gluTest, glucoseTest], 'no completion'],
    ['women with sod', [creole], 'no completion'],
    ['sod', [creole], 'no completion'],
  ] as const)('Tab on %s → %s', (text, tests, after) => {
    expect(taken(text, [...tests])).toBe(after);
  });
});
