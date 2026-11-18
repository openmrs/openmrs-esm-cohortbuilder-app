import { describe, expect, it } from 'vitest';
import { getDefaultsFromConfigSchema } from '@openmrs/esm-framework';
import { type ConfigObject, configSchema } from '../config-schema';
import { readUrlRequest } from '../url-definition/url-definition';
import { definitionUrl } from './cohort-builder-links';
import goldenFixtures from './golden-fixtures.json';
import { type CohortCriteriaConfig, cohortCriteriaConfig, parseCohortCriteria } from './parse-cohort-criteria';

/**
 * Text → parseCohortCriteria → definitionUrl → readUrlRequest, the builder's own decoder: every link the
 * omnibar row offers opens in the builder as the same criteria. This replaces the cross-repo check
 * (cohort/xcheck): its 49 phrases are below, 48 with drug criteria on and one with them off.
 */

const shipped = cohortCriteriaConfig(getDefaultsFromConfigSchema(configSchema) as ConfigObject);
const drugsOn: CohortCriteriaConfig = { ...shipped, drugCriteriaEnabled: true };

function roundTrip(text: string, config: CohortCriteriaConfig) {
  const definition = parseCohortCriteria(text, config);
  const url = definition && definitionUrl(definition);
  const decoded = url && readUrlRequest(new URLSearchParams(url.split('?')[1]));
  return { definition, url, decoded };
}

const xcheckPhrases = [
  // The omnibar's own test phrases, with the shipped config.
  'aged 30',
  'enrolled in ART',
  'female patients aged 15-49 on ARVs',
  'in HIV program',
  'in hiv tb program',
  'in the ART program',
  'men over 50 in TB program',
  'on ART',
  'on ARVs',
  'on TLD',
  'under 5',
  'women aged 15-49 enrolled in HIV program',
  'women aged 15-49 on ARVs',
  'women aged 15-49',
  'women',
  // Every age form, and its edges.
  'men',
  'patients over 49',
  'women older than 64',
  'people above 14',
  'boys under 15',
  'girls younger than 1',
  'patients below 151',
  'women at least 50',
  'men at most 4',
  'patients 50+',
  'women 65 and over',
  'men 14 or younger',
  'patients 30 years old',
  'women aged 15 to 49',
  'men between 15 and 49',
  'patients age 0',
  'patients aged 0+',
  'women at least 0 years',
  'patients over 149',
  'patients over 150',
  'patients aged 150',
  'women aged 49-15',
  'women aged 15–49 years old',
  // Programs, drugs, combinations and the caps.
  'enrolled in pmtct',
  'patients in the diabetes program',
  'women in PrEP programme',
  'in the hiv care and treatment program',
  'enrolled in hiv and enrolled in diabetes',
  'women over 50 in hiv program in pmtct program in prep program in diabetes program',
  'women over 50 in hiv program in pmtct program in prep program in diabetes program on arvs',
  'patients enrolled in hiv taking antiretrovirals',
  'men on arvs receiving tld',
  'patients on art in art program',
];

/** What gives no row, and why. */
const declined = {
  'in hiv tb program': 'no TB program in the demo',
  'men over 50 in TB program': 'no TB program in the demo',
  'on TLD': 'no TLD Drug in the demo',
  'men on arvs receiving tld': 'no TLD Drug in the demo',
  'girls younger than 1': 'maxAge 0, which the builder reads as unset',
  'patients age 0': 'maxAge 0, which the builder reads as unset',
  'patients aged 0+': 'a lone minAge 0 bounds nothing',
  'patients over 150': 'over 150',
  'women aged 49-15': 'a reversed range',
  'women over 50 in hiv program in pmtct program in prep program in diabetes program on arvs': 'six criteria',
};

describe('every cohort row opens in the builder as the same criteria', () => {
  it.each(xcheckPhrases.filter((text) => !(text in declined)))('%j', (text) => {
    const { definition, url, decoded } = roundTrip(text, drugsOn);
    expect(url).toEqual(expect.any(String));
    expect(decoded).toEqual({ type: 'definition', definition });
  });

  it.each(Object.entries(declined))('offers no row for %j: %s', (text) => {
    expect(roundTrip(text, drugsOn).url ?? null).toBeNull();
  });

  it('runs 38 of the cross-check phrases: its 39 less "patients aged 0+", which now gives no row', () => {
    expect(xcheckPhrases).toHaveLength(48);
    expect(xcheckPhrases.filter((text) => roundTrip(text, drugsOn).url)).toHaveLength(38);
  });

  it('offers nothing for drugs while drug criteria are off, and the rest still round-trips', () => {
    expect(roundTrip('women aged 15-49 on ARVs', shipped).url ?? null).toBeNull();
    const { definition, decoded } = roundTrip('women aged 15-49', shipped);
    expect(decoded).toEqual({ type: 'definition', definition });
  });

  it.each(goldenFixtures)('builds and reads back the golden link for $text', ({ text, drugCriteriaEnabled, url }) => {
    const { definition, url: built, decoded } = roundTrip(text, { ...shipped, drugCriteriaEnabled });
    expect(built).toBe(url);
    expect(decoded).toEqual({ type: 'definition', definition });
  });

  it('never offers a link the builder would refuse, even when the parser accepts the text', () => {
    // 5 drug groups of 50 drugs parse as 5 criteria, but the encoded definition is over 4096 bytes.
    const drugGroups = ['a', 'b', 'c', 'd', 'e'].map((name, i) => ({
      id: name,
      label: name,
      aliases: [`drug${name}`],
      drugUuids: Array.from(
        { length: 50 },
        (_, j) => `${String(i * 50 + j).padStart(8, '0')}-0000-4000-8000-000000000000`,
      ),
      cielConceptUuids: [],
    }));
    const text = 'on druga on drugb on drugc on drugd on druge';
    const { definition, url } = roundTrip(text, { drugCriteriaEnabled: true, programs: [], drugGroups });
    expect(definition.criteria).toHaveLength(5);
    expect(url).toBeNull();
  });
});
