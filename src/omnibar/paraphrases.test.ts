import { describe, expect, it } from 'vitest';
import { type Criterion } from '../url-definition/url-definition';
import { type CohortCriteriaConfig, parseCohortCriteria } from './parse-cohort-criteria';
import { compilePhrases, englishPhrases, tokenize } from './phrases/phrase-table';

/**
 * The paraphrase set: many ways people ask the same population question, each with the criteria it
 * must give, and the ways that must give nothing. A phrase added to phrases/en.json is checked here
 * by the generated cases; a new way of asking belongs in the tables.
 */

const hiv = '64f950e6-1b07-4ac0-8e7e-f3e148f3463f';
const tb = '9f144a34-3a4a-44a9-8486-6b7af6cc64f6';
const admission = 'e22e39fd-7db2-45e7-80f1-60fa0d5a4378';
const tdf = '0b8c3c4e-2f9a-4b1e-9d5c-1a2b3c4d5e6f';
const pmtct = 'd1b6cd43-8ac7-4cdd-8fb4-fe51635c82b4';

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
  encounterTypes: [{ uuid: admission, label: 'Admission', aliases: ['admission', 'inpatient admission'] }],
};

const age = (minAge?: number, maxAge?: number, gender: 'male' | 'female' | 'any' = 'any'): Criterion => ({
  type: 'demographics',
  gender,
  ...(minAge != null && { minAge }),
  ...(maxAge != null && { maxAge }),
});
const women = (minAge?: number, maxAge?: number) => age(minAge, maxAge, 'female');
const men = (minAge?: number, maxAge?: number) => age(minAge, maxAge, 'male');
const inHiv: Criterion = { type: 'enrollment', programs: [hiv] };
const inTb: Criterion = { type: 'enrollment', programs: [tb] };
const inPmtct: Criterion = { type: 'enrollment', programs: [pmtct] };
const onArvs: Criterion = { type: 'drugOrder', drugs: [tdf], activeOnOrAfter: 'today' };
const admitted: Criterion = { type: 'encounter', encounterTypes: [admission] };

const criteriaOf = (text: string) => parseCohortCriteria(text, config)?.criteria ?? null;

describe('the paraphrase set', () => {
  it.each<[string, Array<Criterion>]>([
    // Under an age
    ['patients under 30', [age(undefined, 29)]],
    ['how many patients are under 30?', [age(undefined, 29)]],
    ['patients < 30', [age(undefined, 29)]],
    ['patients <30', [age(undefined, 29)]],
    ['patients below 30', [age(undefined, 29)]],
    ['patients less than 30 years old', [age(undefined, 29)]],
    ['patients younger than 30', [age(undefined, 29)]],
    ['patients under the age of 30', [age(undefined, 29)]],
    ['patients below the age of 30 years', [age(undefined, 29)]],
    ['patients under thirty', [age(undefined, 29)]],
    ['patients under 30 yrs', [age(undefined, 29)]],
    ['patients under 30y', [age(undefined, 29)]],
    ['patients 29 or younger', [age(undefined, 29)]],
    ['patients 29 and under', [age(undefined, 29)]],
    ['patients 29 years and younger', [age(undefined, 29)]],
    ['patients <= 29', [age(undefined, 29)]],
    ['patients ≤29', [age(undefined, 29)]],
    ['patients at most 29', [age(undefined, 29)]],
    ['patients no older than 29', [age(undefined, 29)]],
    ['patients up to 29 years of age', [age(undefined, 29)]],
    ['patients not older than 29', [age(undefined, 29)]],
    ['patients aged up to 29', [age(undefined, 29)]],
    ['patients aged under 30', [age(undefined, 29)]],
    // Over an age
    ['patients over 40', [age(41)]],
    ['patients > 40', [age(41)]],
    ['patients older than forty', [age(41)]],
    ['patients above 40', [age(41)]],
    ['patients more than 40 years old', [age(41)]],
    ['patients over the age of 40', [age(41)]],
    ['patients 41+', [age(41)]],
    ['patients 41 +', [age(41)]],
    ['patients 41 plus', [age(41)]],
    ['patients 41 and over', [age(41)]],
    ['patients 41 years and older', [age(41)]],
    ['patients 41 or more', [age(41)]],
    ['patients >= 41', [age(41)]],
    ['patients ≥ 41', [age(41)]],
    ['patients at least 41', [age(41)]],
    ['patients no younger than 41', [age(41)]],
    ['patients aged 41 and above', [age(41)]],
    ['patients aged over 40', [age(41)]],
    ['patients at least forty-one years old', [age(41)]],
    // Ranges
    ['patients aged 15-49', [age(15, 49)]],
    ['patients aged 15 - 49', [age(15, 49)]],
    ['patients aged 15–49', [age(15, 49)]],
    ['patients aged 15 to 49', [age(15, 49)]],
    ['patients between 15 and 49', [age(15, 49)]],
    ['patients between the ages of 15 and 49', [age(15, 49)]],
    ['patients aged between 15 and 49 years', [age(15, 49)]],
    ['patients from 15 to 49', [age(15, 49)]],
    ['patients 15 through 49', [age(15, 49)]],
    ['patients 15 thru 49 years old', [age(15, 49)]],
    ['15-49 year olds', [age(15, 49)]],
    ['15 to 49 year old patients', [age(15, 49)]],
    ['patients between fifteen and forty-nine', [age(15, 49)]],
    ['patients between fifteen and forty nine', [age(15, 49)]],
    ['patients older than 14 and younger than 50', [age(15, 49)]],
    ['patients at least 15 and at most 49', [age(15, 49)]],
    // Exact ages, and months only where they make whole years exactly
    ['patients aged 30', [age(30, 30)]],
    ['30 year olds', [age(30, 30)]],
    ['30 year old patients', [age(30, 30)]],
    ['patients 30 years old', [age(30, 30)]],
    ['patients 30 y/o', [age(30, 30)]],
    ['patients 30yo', [age(30, 30)]],
    ['patients age thirty', [age(30, 30)]],
    ['children under 24 months', [age(undefined, 1)]],
    ['under 30', [age(undefined, 29)]],
    ['women not under 30', [women(30)]],
    ['patients at least 24 months old', [age(2)]],
    ['patients 24 months and older', [age(2)]],
    // Gender
    ['women', [women()]],
    ['how many women', [women()]],
    ['how many ladies are there', [women()]],
    ["women's count", [women()]],
    ['female clients', [women()]],
    ['number of female patients', [women()]],
    ['men', [men()]],
    ['males', [men()]],
    ['gentlemen over 50', [men(51)]],
    ['boys under 5', [men(undefined, 4)]],
    ['girls aged 10 to 14', [women(10, 14)]],
    // Named age groups, with the source in en.json
    ['adolescents', [age(10, 19)]],
    ['how many adolescents', [age(10, 19)]],
    ['female adolescents', [women(10, 19)]],
    ['adolescent girls', [women(10, 19)]],
    ['female children', [women(undefined, 17)]],
    ['elderly men', [men(60)]],
    ['teenagers', [age(13, 19)]],
    ['youth', [age(15, 24)]],
    ['young people', [age(10, 24)]],
    ['children', [age(undefined, 17)]],
    ['kids', [age(undefined, 17)]],
    ['paediatric patients', [age(undefined, 14)]],
    ['pediatric patients', [age(undefined, 14)]],
    ['under fives', [age(undefined, 4)]],
    ['under-fives', [age(undefined, 4)]],
    ['u5', [age(undefined, 4)]],
    ['adults', [age(18)]],
    ['adult men', [men(18)]],
    ['adults over 50', [age(51)]],
    ['adolescents under 15', [age(10, 14)]],
    ['women of reproductive age under 30', [women(15, 29)]],
    ['children under 5', [age(undefined, 4)]],
    ['children aged 10 to 30', [age(10, 17)]],
    ['elderly patients', [age(60)]],
    ['older people', [age(60)]],
    ['seniors', [age(60)]],
    ['women of reproductive age', [women(15, 49)]],
    ['women of childbearing age', [women(15, 49)]],
    ['WRA', [women(15, 49)]],
    // Programs
    ['enrolled in HIV', [inHiv]],
    ['patients enrolled in the HIV program', [inHiv]],
    ['patients in the HIV programme', [inHiv]],
    ['how many patients are enrolled in HIV care', [inHiv]],
    ['HIV program patients', [inHiv]],
    ['patients registered in the TB program', [inTb]],
    ['TB clinic patients', [inTb]],
    ['patients in the tuberculosis clinic', [inTb]],
    ['patients on the TB program', [inTb]],
    ['patients currently enrolled in TB', [inTb]],
    ['patients in the Tuberculosis Program', [inTb]],
    ['patients in the tuberculoses program', [inTb]],
    ['patients in the tuberclosis program', [inTb]],
    ['enrolled in hiv and enrolled in tb', [inHiv, inTb]],
    ['patients in the HIV program and the TB program', [inHiv, inTb]],
    // Drugs
    ['on ARVs', [onArvs]],
    ['patients taking antiretrovirals', [onArvs]],
    ['patients receiving ARVs', [onArvs]],
    ['patients prescribed ARVs', [onArvs]],
    ['patients on antiretroviral', [onArvs]],
    // Encounters
    ['patients with an admission encounter', [admitted]],
    ['patients who had an admission encounter', [admitted]],
    ['inpatient admission encounters', [admitted]],
    // Together
    ['women aged 15-49 on ARVs', [women(15, 49), onArvs]],
    ['women and on ARVs', [women(), onArvs]],
    ['women under 30 on ARVs', [women(undefined, 29), onArvs]],
    ['female children under 5', [women(undefined, 4)]],
    ['women under 5', [women(undefined, 4)]],
    ['female children under 5 years', [women(undefined, 4)]],
    ['women aged 15-49, enrolled in HIV', [women(15, 49), inHiv]],
    ['patients in the HIV program, the TB program', [inHiv, inTb]],
    ['women aged 15-49; on ARVs', [women(15, 49), onArvs]],
    ['adolescent girls in the PMTCT program', [women(10, 19), inPmtct]],
    ['women over 50 and under 60', [women(51, 59)]],
    ['how many women between 15 and 49 are enrolled in HIV?', [women(15, 49), inHiv]],
    ['men over 50 in the TB program', [men(51), inTb]],
    ['adolescent girls enrolled in hiv care on arvs', [women(10, 19), inHiv, onArvs]],
    ['children under 5 with an admission encounter', [age(undefined, 4), admitted]],
    ['number of HIV program patients under 30', [age(undefined, 29), inHiv]],
    ['what is the total number of women of reproductive age enrolled in HIV', [women(15, 49), inHiv]],
    ['show me all men 50+ taking ARVs', [men(50), onArvs]],
    ['list adults in the TB clinic', [age(18), inTb]],
  ])('reads %j', (text, criteria) => {
    expect(criteriaOf(text)).toEqual(criteria);
  });

  it.each([
    // Negations and alternatives are never read as something else.
    'women not on ARVs',
    'patients not enrolled in HIV',
    'not enrolled in the HIV program',
    'patients without an admission encounter',
    'women or men',
    'women and men',
    'under 30 or over 60',
    'everyone except men',
    'non adults',
    'adults but not women',
    'patients outside the HIV program',
    'neither women nor men',
    'patients never on ARVs',
    'no women',
    'patients over 14 but under 50',
    // A program needs "enrolled" or "program" each time.
    'enrolled in hiv and tb',
    'TB enrollments',
    // Words it doesn't know, or too vague to guess.
    'patients with HIV',
    'HIV patients',
    'how many HIV patients',
    'in HIV',
    'admission',
    'diabetes',
    'babies',
    'infants under 6 months',
    'patients under 18 months',
    // Months are whole years only below or from a multiple of 12: "at most 12 months" takes in 23 months.
    'patients at most 12 months',
    'patients 12 months or younger',
    'patients over 12 months',
    'patients 24 months old',
    'patients aged 24 months',
    'patients between 12 and 24 months',
    'patients between 12 months and 24 months',
    'patients 12 months to 24 months',
    'patients over 2 weeks old',
    'patients aged 3 days',
    'women in their forties',
    'patients over 18 over 21',
    'over 30 under 20',
    'patients 15',
    'women 15',
    'adults under 10',
    'children over 20 and under 30',
    // Two named groups: likely an "or" or a slip, never a narrow band between them.
    'adolescent adults',
    'adolescent teens',
    'youth adolescents',
    'children and adults',
    'women of reproductive age men',
    'men of reproductive age',
    // "and" or "with" between a gender and a named group joins two populations, never the people in both.
    'how many women and children',
    'how many women and children enrolled in HIV',
    'women with children',
    'men and children',
    'women and adolescents',
    'children and women',
    'adolescents with the women',
    'women of reproductive age and children',
    // The same with an age or a criterion between them.
    'women under 30 and children',
    'women under 30 with children',
    'women under 50 and children',
    'men under 40 and adolescents',
    'children under 5 and women',
    'adolescents under 15 and women',
    'women on ARVs and children',
    // An age right after "and", "with" or a comma that follows a population may be a second one.
    'women and under 5',
    'women and under five',
    'kids and under 5',
    'women with under 5',
    'women and under 5 years',
    'women and under five years',
    'women and under five years old',
    'kids and under 5 years',
    'women and under 30',
    'women, 15-49, on ARVs',
    // A comma joins two populations as "and" does.
    'women, children',
    'children, women',
    'men, adolescents under 15',
    'women; children',
    'women; under 5',
    'a hundred patients',
    'patients aged one hundred',
    'cd4 count',
    'viral load under 1000',
    'patients under 1000',
    'Mary Achieng',
    '100GEJ',
    'women 1234567',
    '50+',
    '<30',
  ])('offers nothing for %j', (text) => {
    expect(criteriaOf(text)).toBeNull();
  });
});

describe('every phrase in the English table', () => {
  const tableHas = (list: Array<unknown>) => list.length > 0;

  it.each(englishPhrases.under)('reads "under" phrase %j as below the number', (phrase) => {
    expect(criteriaOf(`patients ${phrase} 30`)).toEqual([age(undefined, 29)]);
    expect(criteriaOf(`patients ${phrase} 30 years`)).toEqual([age(undefined, 29)]);
  });

  it.each(englishPhrases.atMost)('reads "at most" phrase %j as the number or below', (phrase) => {
    expect(criteriaOf(`patients ${phrase} 30`)).toEqual([age(undefined, 30)]);
  });

  it.each(englishPhrases.over)('reads "over" phrase %j as above the number', (phrase) => {
    expect(criteriaOf(`patients ${phrase} 30`)).toEqual([age(31)]);
    expect(criteriaOf(`patients ${phrase} 30 years old`)).toEqual([age(31)]);
  });

  it.each(englishPhrases.atLeast)('reads "at least" phrase %j as the number or above', (phrase) => {
    expect(criteriaOf(`patients ${phrase} 30`)).toEqual([age(30)]);
  });

  it.each(englishPhrases.aged)('reads "aged" phrase %j before a number as that age', (phrase) => {
    expect(criteriaOf(`patients ${phrase} 30`)).toEqual([age(30, 30)]);
  });

  it.each(englishPhrases.orUnder)('reads "or under" phrase %j after a number as that age or below', (phrase) => {
    expect(criteriaOf(`patients 30 ${phrase}`)).toEqual([age(undefined, 30)]);
  });

  it.each(englishPhrases.orOver)('reads "or over" phrase %j after a number as that age or above', (phrase) => {
    expect(criteriaOf(`patients 30 ${phrase}`)).toEqual([age(30)]);
  });

  it.each(englishPhrases.rangeTo)('reads range word %j between two numbers', (phrase) => {
    expect(criteriaOf(`patients 15 ${phrase} 49`)).toEqual([age(15, 49)]);
    expect(criteriaOf(`patients aged 15 ${phrase} 49 years`)).toEqual([age(15, 49)]);
  });

  it.each(englishPhrases.rangeFrom)('reads range start %j with "and" or a range word', (phrase) => {
    expect(criteriaOf(`patients ${phrase} 15 and 49`)).toEqual([age(15, 49)]);
    expect(criteriaOf(`patients ${phrase} 15 to 49`)).toEqual([age(15, 49)]);
  });

  it.each(englishPhrases.years)('reads year unit %j after a number', (unit) => {
    expect(criteriaOf(`patients under 30 ${unit}`)).toEqual([age(undefined, 29)]);
  });

  it.each(englishPhrases.months)('reads month unit %j only below or from a whole number of years', (unit) => {
    expect(criteriaOf(`patients under 36 ${unit}`)).toEqual([age(undefined, 2)]);
    expect(criteriaOf(`patients at least 36 ${unit}`)).toEqual([age(3)]);
    expect(criteriaOf(`patients under 30 ${unit}`)).toBeNull();
    expect(criteriaOf(`patients over 36 ${unit}`)).toBeNull();
  });

  it.each(englishPhrases.otherUnits)('never reads an age in %j', (unit) => {
    expect(criteriaOf(`patients under 30 ${unit}`)).toBeNull();
  });

  it.each(englishPhrases.female)('reads %j as women', (word) => {
    expect(criteriaOf(word)).toEqual([women()]);
  });

  it.each(englishPhrases.male)('reads %j as men', (word) => {
    expect(criteriaOf(word)).toEqual([men()]);
  });

  it.each(englishPhrases.enrolled)('reads enrolment word %j before a program', (word) => {
    expect(criteriaOf(`patients ${word} in TB`)).toEqual([inTb]);
  });

  it.each(englishPhrases.programNouns)('reads program word %j after a program', (word) => {
    expect(criteriaOf(`patients in the TB ${word}`)).toEqual([inTb]);
  });

  it.each(englishPhrases.drugVerbs)('reads drug word %j before a drug group', (word) => {
    expect(criteriaOf(`patients ${word} ARVs`)).toEqual([onArvs]);
  });

  it.each(englishPhrases.stopwords)('skips stopword %j around a question', (word) => {
    expect(criteriaOf(`${word} under 30 ${word} women ${word}`)).toEqual([women(undefined, 29)]);
  });

  it.each(englishPhrases.never)('offers nothing when %j is in the question', (word) => {
    expect(criteriaOf(`women ${word} on ARVs`)).toBeNull();
    expect(criteriaOf(`${word} women on ARVs`)).toBeNull();
    expect(criteriaOf(`women on ARVs ${word}`)).toBeNull();
  });

  it.each(Object.entries(englishPhrases.numbers))('reads the number word %j as %i', (word, value) => {
    expect(criteriaOf(`patients aged ${word} to 99`)).toEqual(value === 0 ? [age(0, 99)] : [age(value, 99)]);
  });

  it('reads every number from 1 to 99 in words, alone and hyphenated', () => {
    const units = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
    const teens = [
      'ten',
      'eleven',
      'twelve',
      'thirteen',
      'fourteen',
      'fifteen',
      'sixteen',
      'seventeen',
      'eighteen',
      'nineteen',
    ];
    const tens = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
    for (let n = 1; n <= 99; n++) {
      const words =
        n < 10
          ? [units[n]]
          : n < 20
          ? [teens[n - 10]]
          : n % 10
          ? [`${tens[Math.floor(n / 10)]} ${units[n % 10]}`, `${tens[Math.floor(n / 10)]}-${units[n % 10]}`]
          : [tens[n / 10]];
      for (const word of words) {
        expect([word, criteriaOf(`patients at least ${word}`)]).toEqual([word, [age(n)]]);
      }
    }
  });

  it.each(englishPhrases.ageGroups.flatMap((group) => group.phrases.map((phrase) => [phrase, group] as const)))(
    'reads age group phrase %j with its bounds',
    (phrase, group) => {
      expect(criteriaOf(phrase)).toEqual([age(group.minAge, group.maxAge, group.gender ?? 'any')]);
    },
  );

  it('has no empty list', () => {
    for (const [name, list] of Object.entries(englishPhrases)) {
      if (Array.isArray(list)) expect([name, tableHas(list)]).toEqual([name, true]);
    }
  });
});

describe('the English table holds together', () => {
  const words = (list: Array<string>) => list.map((phrase) => tokenize(phrase).join(' '));
  const overlap = (a: Array<string>, b: Array<string>) => words(a).filter((phrase) => words(b).includes(phrase));

  it('gives no phrase two meanings', () => {
    const { under, atMost, over, atLeast, aged, orUnder, orOver, female, male } = englishPhrases;
    const before = { under, atMost, over, atLeast, aged };
    for (const [a, listA] of Object.entries(before)) {
      for (const [b, listB] of Object.entries(before)) {
        if (a < b) expect([a, b, overlap(listA, listB)]).toEqual([a, b, []]);
      }
    }
    expect(overlap(orUnder, orOver)).toEqual([]);
    expect(overlap(female, male)).toEqual([]);
  });

  it('never makes a negation or an alternative a stopword', () => {
    const never = new Set(englishPhrases.never);
    for (const phrase of englishPhrases.stopwords) {
      expect([phrase, tokenize(phrase).some((token) => never.has(token))]).toEqual([phrase, false]);
    }
  });

  it('gives every age group a source and bounds in order', () => {
    for (const group of englishPhrases.ageGroups) {
      expect(group.source).toEqual(expect.any(String));
      expect(group.minAge ?? 0).toBeLessThanOrEqual(group.maxAge ?? 150);
    }
  });

  it('can tokenize every phrase', () => {
    for (const [name, list] of Object.entries(englishPhrases)) {
      if (!Array.isArray(list) || name === 'ageGroups') continue;
      for (const phrase of list as Array<string>) {
        expect([name, phrase, tokenize(phrase)?.length > 0]).toEqual([name, phrase, true]);
      }
    }
  });
});

describe('names from config or the server', () => {
  it('ignores a name that would take a negation or an alternative, so the question still gives nothing', () => {
    const named: CohortCriteriaConfig = {
      ...config,
      programs: [
        ...config.programs,
        { uuid: '1d2e3f40-1111-4222-8333-444455556666', label: 'Not HIV Program', aliases: ['Not HIV', 'Or'] },
      ],
      drugGroups: [{ ...config.drugGroups[0], aliases: ['arvs', 'no arvs'] }],
      encounterTypes: [{ uuid: admission, label: 'Non Admission', aliases: ['admission'] }],
    };
    const texts = [
      'patients not HIV program',
      'enrolled in not HIV',
      'patients or program',
      'or clinic',
      'patients on no ARVs',
      'patients with a non admission encounter',
    ];
    expect(texts.map((text) => [text, parseCohortCriteria(text, named)])).toEqual(texts.map((text) => [text, null]));
    expect(parseCohortCriteria('patients in the HIV program on ARVs', named)?.criteria).toEqual([inHiv, onArvs]);
    expect(parseCohortCriteria('patients with an admission encounter', named)?.criteria).toEqual([admitted]);
  });

  it('reads a name typed with one slip in all of its words, when no other name is one slip away', () => {
    const breastCancer = '2d2e3f40-1111-4222-8333-444455556666';
    const diabetes = '3d2e3f40-1111-4222-8333-444455556666';
    const named: CohortCriteriaConfig = {
      ...config,
      programs: [
        ...config.programs,
        { uuid: breastCancer, label: 'Breast Cancer Program', aliases: ['breast cancer'] },
        { uuid: diabetes, label: 'Diabetes Program', aliases: ['diabetes'] },
      ],
    };
    const criteria = (text: string, programs = named.programs) =>
      parseCohortCriteria(text, { ...named, programs })?.criteria ?? null;
    const inBreastCancer: Criterion = { type: 'enrollment', programs: [breastCancer] };
    expect(criteria('patients in the brest cancer program')).toEqual([inBreastCancer]);
    expect(criteria('enrolled in breast cancor')).toEqual([inBreastCancer]);
    expect(criteria('patients in the tuberclosis program')).toEqual([inTb]);
    expect(criteria('enrolled in diabetis')).toEqual([{ type: 'enrollment', programs: [diabetes] }]);
    expect(criteria('patients in the brest cancor program')).toBeNull();
    expect(criteria('enrolled in brest cancor')).toBeNull();
    expect(
      criteria('enrolled in diabetis', [
        ...named.programs,
        { uuid: '4d2e3f40-1111-4222-8333-444455556666', label: 'Diabetic Clinic', aliases: ['diabetic'] },
      ]),
    ).toBeNull();
  });
});

describe("a site's own phrases", () => {
  it('adds phrases and age groups from config', () => {
    const phrases = compilePhrases(undefined, {
      under: ['younger then'],
      stopwords: ['wagonjwa'],
      ageGroups: [{ phrases: ['school age children'], minAge: 6, maxAge: 12 }],
    });
    const siteConfig = { ...config, phrases };
    expect(parseCohortCriteria('wagonjwa younger then 30', siteConfig)?.criteria).toEqual([age(undefined, 29)]);
    expect(parseCohortCriteria('school age children', siteConfig)?.criteria).toEqual([age(6, 12)]);
    expect(criteriaOf('wagonjwa younger then 30')).toBeNull();
  });

  it('ignores a stopword that would hide a negation or an alternative', () => {
    const phrases = compilePhrases(undefined, { stopwords: ['not', 'or else', 'without'] });
    expect(parseCohortCriteria('women not on ARVs', { ...config, phrases })).toBeNull();
    expect(parseCohortCriteria('women or else men', { ...config, phrases })).toBeNull();
  });

  it.each([
    ['programLinkers', 'patients not HIV program'],
    ['enrolled', 'except HIV program'],
    ['drugVerbs', 'patients not ARVs'],
    ['encounterNouns', 'admission or'],
    ['programNouns', 'patients in HIV without'],
    ['under', 'patients or 30'],
    ['female', 'not women'],
    ['rangeTo', 'patients 15 or 49'],
  ] as const)('ignores an added %s phrase holding a negation or an alternative, so %j gives nothing', (list, text) => {
    const word = text.split(' ').find((token) => englishPhrases.never.includes(token));
    const phrases = compilePhrases(undefined, { [list]: [word] });
    expect(parseCohortCriteria(text, { ...config, phrases })).toBeNull();
  });

  it.each([
    "isn't",
    'isnt',
    "don't",
    "doesn't",
    "aren't",
    "wasn't",
    "can't",
    'cannot',
    "won't",
    "ain't",
    'excl',
    'neither',
  ])('ignores an added program linker %j, a negation once its apostrophe is gone', (word) => {
    const phrases = compilePhrases(undefined, { programLinkers: [word] });
    expect(parseCohortCriteria(`patients ${word} HIV program`, { ...config, phrases })).toBeNull();
  });

  it('ignores an added age group named with a negation', () => {
    const phrases = compilePhrases(undefined, { ageGroups: [{ phrases: ['not adults'], maxAge: 17 }] });
    expect(parseCohortCriteria('not adults', { ...config, phrases })).toBeNull();
  });

  it('ignores malformed additions', () => {
    const phrases = compilePhrases(undefined, {
      under: [7 as never, 'x'.repeat(81), 'café <script>'],
      ageGroups: [
        { phrases: ['backwards'], minAge: 30, maxAge: 20 },
        { phrases: ['too old'], minAge: 151 },
        { phrases: ['no bounds'] },
        { phrases: ['half years'], minAge: 1.5 },
        { phrases: ['odd gender'], minAge: 1, gender: 'other' as never },
      ],
    });
    for (const text of ['backwards', 'too old', 'no bounds', 'half years', 'odd gender']) {
      expect(parseCohortCriteria(text, { ...config, phrases })).toBeNull();
    }
    expect(parseCohortCriteria('patients under 30', { ...config, phrases })?.criteria).toEqual([age(undefined, 29)]);
  });
});
