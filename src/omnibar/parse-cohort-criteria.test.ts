import { describe, expect, it } from 'vitest';
import { getDefaultsFromConfigSchema } from '@openmrs/esm-framework';
import { type ConfigObject, configSchema } from '../config-schema';
import { type Criterion } from '../url-definition/url-definition';
import { definitionUrl } from './cohort-builder-links';
import goldenFixtures from './golden-fixtures.json';
import { type CohortCriteriaConfig, cohortCriteriaConfig, parseCohortCriteria } from './parse-cohort-criteria';

const hiv = '64f950e6-1b07-4ac0-8e7e-f3e148f3463f';
const tb = '9f144a34-3a4a-44a9-8486-6b7af6cc64f6';
const tdf = '0b8c3c4e-2f9a-4b1e-9d5c-1a2b3c4d5e6f';
const efv = '1c9d4d5f-3a0b-4c2f-8e6d-2b3c4d5e6f70';
const tldDrug = '165086AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
const admission = 'e22e39fd-7db2-45e7-80f1-60fa0d5a4378';
const vitals = '67a71486-1a54-468f-ac3e-7091a9a79584';

const config: CohortCriteriaConfig = {
  drugCriteriaEnabled: true,
  programs: [
    { uuid: hiv, label: 'HIV Program', aliases: ['hiv', 'hiv care'] },
    { uuid: tb, label: 'TB Program', aliases: ['tb', 'tuberculosis'] },
  ],
  drugGroups: [
    {
      id: 'arv',
      label: 'ARVs',
      aliases: ['arv', 'arvs', 'antiretroviral', 'antiretrovirals'],
      drugUuids: [tdf, efv],
      cielConceptUuids: [],
    },
    { id: 'tld', label: 'TLD', aliases: ['tld'], drugUuids: [tldDrug], cielConceptUuids: [] },
    { id: 'statins', label: 'Statins', aliases: ['statin', 'statins'], drugUuids: [], cielConceptUuids: [] },
  ],
  encounterTypes: [
    { uuid: admission, label: 'Admission', aliases: ['admission', 'inpatient admission'] },
    { uuid: vitals, label: 'Vitals', aliases: ['vitals', 'vital signs'] },
  ],
};

const demographics = (gender: 'male' | 'female' | 'any', minAge?: number, maxAge?: number): Criterion => ({
  type: 'demographics',
  gender,
  ...(minAge != null && { minAge }),
  ...(maxAge != null && { maxAge }),
});
const enrollment = (program: string): Criterion => ({ type: 'enrollment', programs: [program] });
const drugOrder = (...drugs: Array<string>): Criterion => ({
  type: 'drugOrder',
  drugs,
  activeOnOrAfter: 'today',
});
const arvs = drugOrder(tdf, efv);
const encounter = (encounterType: string): Criterion => ({ type: 'encounter', encounterTypes: [encounterType] });

describe('parseCohortCriteria', () => {
  it.each<[string, Array<Criterion>]>([
    ['women', [demographics('female')]],
    ['female patients', [demographics('female')]],
    ['females', [demographics('female')]],
    ['girls', [demographics('female')]],
    ['males', [demographics('male')]],
    ['boys', [demographics('male')]],
    ['men over 50', [demographics('male', 51)]],
    ['patients older than 65', [demographics('any', 66)]],
    ['people under 5', [demographics('any', undefined, 4)]],
    ['younger than 18', [demographics('any', undefined, 17)]],
    ['aged 15-49', [demographics('any', 15, 49)]],
    ['aged 15–49', [demographics('any', 15, 49)]],
    ['women aged 15 to 49', [demographics('female', 15, 49)]],
    ['between 18 and 65', [demographics('any', 18, 65)]],
    ['between 0 and 5', [demographics('any', 0, 5)]],
    ['women 0+', [demographics('female')]],
    ['ages between 18 and 65 years', [demographics('any', 18, 65)]],
    ['patients 65+', [demographics('any', 65)]],
    ['65 and over', [demographics('any', 65)]],
    ['18 or younger', [demographics('any', undefined, 18)]],
    ['at least 18 years old', [demographics('any', 18)]],
    ['aged 30', [demographics('any', 30, 30)]],
    ['men 40 years old', [demographics('male', 40, 40)]],
    ['over 18 and under 65', [demographics('any', 19, 64)]],
    ['in HIV program', [enrollment(hiv)]],
    ['enrolled in TB program', [enrollment(tb)]],
    ['enrolled in the HIV programme', [enrollment(hiv)]],
    ['enrolled in hiv', [enrollment(hiv)]],
    ['patients in the tuberculosis program', [enrollment(tb)]],
    ['enrolled in hiv care', [enrollment(hiv)]],
    ['on ARVs', [arvs]],
    ['taking antiretrovirals', [arvs]],
    ['patients on TLD', [drugOrder(tldDrug)]],
    ['currently on arvs', [arvs]],
    ['female patients aged 15-49 on ARVs', [demographics('female', 15, 49), arvs]],
    ['Show all women who are enrolled in HIV program and on ARVs', [demographics('female'), enrollment(hiv), arvs]],
    ['men over 50 in TB program taking ARVs', [demographics('male', 51), enrollment(tb), arvs]],
    ['enrolled in HIV and TB programs', [enrollment(hiv), enrollment(tb)]],
    ['on ARVs and on TLD', [arvs, drugOrder(tldDrug)]],
    ['female patients aged 15–49 on ARVs?', [demographics('female', 15, 49), arvs]],
    ['find patients who are women over 50', [demographics('female', 51)]],
    ['build cohort of men in HIV program', [demographics('male'), enrollment(hiv)]],
  ])('understands %j', (text, criteria) => {
    expect(parseCohortCriteria(text, config)?.criteria).toEqual(criteria);
  });

  it.each([
    ['empty input', ''],
    ['only stopwords', 'show all patients'],
    ['a numeric id', '123456'],
    ['a compact id', '100GEJ'],
    ['a hyphenated id', 'MRN-1234'],
    ['an id after a gender', 'women 1234567'],
    ['a uuid', '8673ee4f-e2ab-4077-ba55-4980f408773e'],
    ['a bare age range', '15-49'],
    ['a bare age with a plus', '50+'],
    ['a name', 'Mary Achieng'],
    ['either gender', 'women or men'],
    ['both genders', 'women and men'],
    ['an age right after a comma after a gender', 'Women, over 50.'],
    ['a negation', 'women not on ARVs'],
    ['a bare "in" with a program', 'in HIV'],
    ['an unknown program', 'in malaria program'],
    ['a drug group without drug uuids', 'on statins'],
    ['a known part next to a group without drug uuids', 'women on statins'],
    ['an unknown word next to known ones', 'women over 50 with diabetes'],
    ['an unknown condition', 'patients with HIV'],
    ['an age over 150', 'over 150'],
    ['an age of 1000', 'aged 1000'],
    ['a negative bound', 'under 0'],
    ['an upper bound of 0, which the builder reads as unset', 'under 1'],
    ['an upper bound of 0 from "younger than"', 'younger than 1'],
    ['an upper bound of 0 from "at most"', 'at most 0'],
    ['an exact age of 0', '0 years old'],
    ['an exact age of 0 with a gender', 'girls aged 0'],
    ['a lone lower bound of 0', 'at least 0'],
    ['a lone 0+', 'patients 0+'],
    ['a lone 0 and over', '0 and over'],
    ['a reversed range', 'aged 50-20'],
    ['two lower bounds', 'over 18 over 21'],
    ['a dangling verb', 'women on'],
    ['a word we do not guess', 'villagers'],
    ['a character we never parse', 'women café'],
    ['a concept lookup', 'cd4 count'],
  ])('rejects %s: %j', (_label, text) => {
    expect(parseCohortCriteria(text, config)).toBeNull();
  });

  describe('counting phrasing', () => {
    it.each<[string, string]>([
      ['how many women', 'women'],
      ['how many patients are under 30?', 'patients under 30'],
      ['How many patients are there under 30', 'patients under 30'],
      ['count of men over 50', 'men over 50'],
      ['count women aged 15-49', 'women aged 15-49'],
      ['number of patients enrolled in HIV program', 'patients enrolled in HIV program'],
      ['what is the total number of patients in the TB program', 'patients in the TB program'],
      ['how many patients have had an admission encounter', 'patients with an admission encounter'],
    ])('reads %j as %j', (counting, plain) => {
      expect(parseCohortCriteria(counting, config)).toEqual(parseCohortCriteria(plain, config));
      expect(parseCohortCriteria(counting, config)).not.toBeNull();
    });

    it.each(['how many', 'count', 'number of patients', 'how many HIV patients', 'how many patients with HIV'])(
      'offers nothing for %j, which names no criterion it can read',
      (text) => {
        expect(parseCohortCriteria(text, config)).toBeNull();
      },
    );
  });

  describe('encounter types', () => {
    it.each<[string, Array<Criterion>]>([
      ['patients with an admission encounter', [encounter(admission)]],
      ['admission encounters', [encounter(admission)]],
      ['women with a vital signs encounter', [demographics('female'), encounter(vitals)]],
      ['patients with inpatient admission encounters', [encounter(admission)]],
    ])('reads %j', (text, criteria) => {
      expect(parseCohortCriteria(text, config).criteria).toEqual(criteria);
    });

    it('ANDs two encounter types, each with its own "encounter"', () => {
      expect(
        parseCohortCriteria('patients with a vitals encounter and an admission encounter', config).criteria,
      ).toEqual([encounter(vitals), encounter(admission)]);
    });

    it.each([
      'admission',
      'patients with admission',
      'an admission visit',
      'with a discharge encounter',
      // Each type needs its own "encounter", so a list of them isn't read.
      'men under 30 with vitals and admission encounters',
    ])('offers nothing for %j without the word "encounter" or with an unknown type', (text) => {
      expect(parseCohortCriteria(text, config)).toBeNull();
    });

    it('describes encounters in the label', () => {
      expect(parseCohortCriteria('women with an admission encounter', config).label).toBe(
        'Female patients with Admission encounters',
      );
    });

    it('rejects encounter types whose uuids the cohort builder would refuse', () => {
      expect(
        parseCohortCriteria('admission encounters', {
          ...config,
          encounterTypes: [{ uuid: 'reporting.library.x', label: 'Admission', aliases: ['admission'] }],
        }),
      ).toBeNull();
    });

    it('understands no encounter type with none configured', () => {
      expect(parseCohortCriteria('admission encounters', { ...config, encounterTypes: [] })).toBeNull();
      expect(parseCohortCriteria('admission encounters', { ...config, encounterTypes: undefined })).toBeNull();
    });
  });

  it('describes the cohort in its label', () => {
    expect(parseCohortCriteria('female patients aged 15-49 on ARVs', config).label).toBe(
      'Female patients aged 15–49 on ARVs',
    );
    expect(parseCohortCriteria('men over 50 in TB program', config).label).toBe('Male patients aged 51+ in TB Program');
    expect(parseCohortCriteria('under 5', config).label).toBe('Patients aged 4 or younger');
    expect(parseCohortCriteria('aged 30', config).label).toBe('Patients aged 30');
  });

  it('returns a v1 definition', () => {
    expect(parseCohortCriteria('women', config)).toEqual({
      v: 1,
      label: 'Female patients',
      criteria: [demographics('female')],
    });
  });

  it('copies drug uuids rather than sharing the config array', () => {
    const [criterion] = parseCohortCriteria('on TLD', config).criteria;
    expect(criterion.type === 'drugOrder' && criterion.drugs).not.toBe(config.drugGroups[1].drugUuids);
  });

  it('rejects programs and drug groups whose uuids the cohort builder would refuse', () => {
    const broken: CohortCriteriaConfig = {
      drugCriteriaEnabled: true,
      programs: [{ uuid: 'not-a-uuid', label: 'HIV Program', aliases: ['hiv'] }],
      drugGroups: [{ id: 'arv', label: 'ARVs', aliases: ['arvs'], drugUuids: ['../drug'], cielConceptUuids: [] }],
    };
    expect(parseCohortCriteria('in HIV program', broken)).toBeNull();
    expect(parseCohortCriteria('on ARVs', broken)).toBeNull();
  });

  it('rejects a drug group with more drugs than the contract allows', () => {
    const drugUuids = Array.from({ length: 51 }, (_, i) => `${String(i).padStart(8, '0')}-0000-4000-8000-000000000000`);
    const big: CohortCriteriaConfig = {
      drugCriteriaEnabled: true,
      programs: [],
      drugGroups: [{ id: 'arv', label: 'ARVs', aliases: ['arvs'], drugUuids, cielConceptUuids: [] }],
    };
    expect(parseCohortCriteria('on ARVs', big)).toBeNull();
    expect(
      parseCohortCriteria('on ARVs', {
        ...big,
        drugGroups: [{ ...big.drugGroups[0], drugUuids: drugUuids.slice(0, 50) }],
      }),
    ).not.toBeNull();
  });

  it('rejects more criteria than the contract allows', () => {
    const programs = ['a', 'b', 'c', 'd', 'e'].map((name, i) => ({
      uuid: `${String(i).padStart(8, '0')}-0000-4000-8000-000000000000`,
      label: name,
      aliases: [`p${name}`],
    }));
    const many: CohortCriteriaConfig = { drugCriteriaEnabled: true, programs, drugGroups: [] };
    expect(
      parseCohortCriteria('in pa program in pb program in pc program in pd program in pe program', many),
    ).not.toBeNull();
    expect(
      parseCohortCriteria('women in pa program in pb program in pc program in pd program in pe program', many),
    ).toBeNull();
  });

  it('prefers the longest alias', () => {
    const overlapping: CohortCriteriaConfig = {
      drugCriteriaEnabled: true,
      programs: [
        { uuid: hiv, label: 'HIV Program', aliases: ['hiv'] },
        { uuid: tb, label: 'HIV TB Program', aliases: ['hiv tb'] },
      ],
      drugGroups: [],
    };
    expect(parseCohortCriteria('in hiv tb program', overlapping).criteria).toEqual([enrollment(tb)]);
  });

  describe('with drug criteria turned off', () => {
    const off = { ...config, drugCriteriaEnabled: false };

    it.each(['on ARVs', 'women on ARVs', 'taking antiretrovirals', 'women aged 15-49 on ARVs'])(
      'offers nothing for %j',
      (text) => {
        expect(parseCohortCriteria(text, off)).toBeNull();
      },
    );

    it('still understands everything else', () => {
      expect(parseCohortCriteria('women aged 15-49 enrolled in HIV program', off).criteria).toEqual([
        demographics('female', 15, 49),
        enrollment(hiv),
      ]);
    });
  });

  describe('with the shipped defaults', () => {
    const cohortBuilder = cohortCriteriaConfig(getDefaultsFromConfigSchema(configSchema) as ConfigObject);

    it('reads drugCriteriaEnabled from the top level of the config, and the rest from omnibar', () => {
      const config = getDefaultsFromConfigSchema(configSchema) as ConfigObject;
      expect(cohortCriteriaConfig({ ...config, drugCriteriaEnabled: true })).toEqual({
        drugCriteriaEnabled: true,
        programs: config.omnibar.programs,
        drugGroups: config.omnibar.drugGroups,
        encounterTypes: config.omnibar.encounterTypes,
        phrases: expect.objectContaining({ numbers: expect.any(Map) }),
      });
    });

    it('ships with drug criteria off, so "on ARVs" offers nothing', () => {
      expect(cohortBuilder.drugCriteriaEnabled).toBe(false);
      expect(parseCohortCriteria('women aged 15-49 on ARVs', cohortBuilder)).toBeNull();
      expect(parseCohortCriteria('women aged 15-49', cohortBuilder)).not.toBeNull();
    });

    it('builds "on ARVs" from the demo formulary once turned on, small enough for the URL', () => {
      const definition = parseCohortCriteria('women aged 15-49 on ARVs', {
        ...cohortBuilder,
        drugCriteriaEnabled: true,
      });
      expect(definition.criteria).toHaveLength(2);
      expect(definition.criteria[1]).toMatchObject({ type: 'drugOrder', activeOnOrAfter: 'today' });
      expect(definitionUrl(definition)).not.toBeNull();
    });

    it('stays silent for TLD, which has no Drug on the demo', () => {
      expect(parseCohortCriteria('on TLD', { ...cohortBuilder, drugCriteriaEnabled: true })).toBeNull();
    });

    const hivCare = '64f950e6-1b07-4ac0-8e7e-f3e148f3463f';
    const pmtct = 'd1b6cd43-8ac7-4cdd-8fb4-fe51635c82b4';
    const prevention = 'ac1bbc45-8c35-49ff-a574-9553ff789527';
    const diabetes = '7a72a724-8994-4d33-962e-f65d8ca4ae67';

    it.each<[string, Array<Criterion>]>([
      ['in HIV program', [enrollment(hivCare)]],
      ['enrolled in PMTCT', [enrollment(pmtct)]],
      ['women in the diabetes program', [demographics('female'), enrollment(diabetes)]],
      ['enrolled in HIV prevention', [enrollment(prevention)]],
      ['in the PrEP program', [enrollment(prevention)]],
      ['enrolled in hiv care and treatment', [enrollment(hivCare)]],
    ])('finds the demo program in %j', (text, criteria) => {
      expect(parseCohortCriteria(text, cohortBuilder).criteria).toEqual(criteria);
    });

    it.each(['in TB program', 'women with diabetes', 'diabetes'])('offers nothing for %j', (text) => {
      expect(parseCohortCriteria(text, cohortBuilder)).toBeNull();
    });

    it('reads ART as the HIV program after "enrolled in" or before "program", and as drugs after "on"', () => {
      const drugsOn = { ...cohortBuilder, drugCriteriaEnabled: true };
      for (const config of [cohortBuilder, drugsOn]) {
        expect(parseCohortCriteria('enrolled in ART', config).criteria).toEqual([enrollment(hivCare)]);
        expect(parseCohortCriteria('in the ART program', config).criteria).toEqual([enrollment(hivCare)]);
      }
      expect(parseCohortCriteria('on ART', cohortBuilder)).toBeNull();
      expect(parseCohortCriteria('on ART', drugsOn).criteria).toEqual([
        expect.objectContaining({ type: 'drugOrder', activeOnOrAfter: 'today' }),
      ]);
    });

    it('never gives one alias to two programs or to two drug groups', () => {
      for (const items of [cohortBuilder.programs, cohortBuilder.drugGroups]) {
        const names = items.flatMap((item) => [
          ...new Set([item.label, ...item.aliases].map((name) => name.toLowerCase())),
        ]);
        expect(new Set(names).size).toBe(names.length);
      }
    });
  });

  /**
   * The links the omnibar built before the providers moved here. src/url-definition/url-definition.test.ts
   * checks the builder decodes the same file, so a change on either side fails a test.
   */
  describe('golden fixtures', () => {
    const cohortBuilder = cohortCriteriaConfig(getDefaultsFromConfigSchema(configSchema) as ConfigObject);

    it.each(goldenFixtures)(
      'builds exactly the shared link for $text',
      ({ text, drugCriteriaEnabled, url, definition }) => {
        const parsed = parseCohortCriteria(text, { ...cohortBuilder, drugCriteriaEnabled });
        expect(parsed).toEqual(definition);
        expect(definitionUrl(parsed)).toBe(url);
      },
    );
  });
});
