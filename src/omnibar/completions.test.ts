import { describe, expect, it } from 'vitest';
import { completionsFor } from './completions';
import { type CohortCriteriaConfig, type CohortTest, parseCohortCriteria } from './parse-cohort-criteria';

const config: CohortCriteriaConfig = {
  drugCriteriaEnabled: false,
  drugGroups: [],
  programs: [],
};

const viralLoad: CohortTest = {
  uuid: '856AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
  label: 'HIV viral load',
  aliases: ['Viral load'],
  units: 'copies/mL',
};
const mch: CohortTest = {
  uuid: '1018AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
  label: 'Mean corpuscular hemoglobin',
  aliases: ['MCH'],
  units: 'pg',
};
const mcv: CohortTest = {
  uuid: '851AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
  label: 'Mean corpuscular volume',
  aliases: ['Mcv'],
  units: 'fL',
};
const baseline: CohortTest = {
  uuid: '81aec00d-4b98-43fa-b241-cb56f7fe4e01',
  label: 'Baseline HIV viral load',
  aliases: [],
  units: '',
};

/** What the field would hold after taking a completion. */
const apply = (query: string, { insert, replace }: { insert: string; replace: number }) =>
  query.slice(0, query.length - replace) + insert;

describe('completions from the count row', () => {
  it('completes a test name being typed, with its units, from what the lookup found', () => {
    const query = 'women with vir';
    const completions = completionsFor(query, config, (words) => (words === 'vir' ? [viralLoad, baseline] : undefined));
    expect(completions).toEqual([
      { insert: 'Viral load ', replace: 3, label: 'Viral load', detail: 'HIV viral load · copies/mL' },
      {
        insert: 'Baseline HIV viral load ',
        replace: 3,
        label: 'Baseline HIV viral load',
        detail: 'Baseline HIV viral load',
      },
    ]);
    expect(apply(query, completions[0])).toBe('women with Viral load ');
  });

  it('replaces every word of the name typed so far, however it was spaced', () => {
    const query = 'women with  hiv  vir';
    const [completion] = completionsFor(query, config, () => [viralLoad]);
    expect(completion).toMatchObject({ insert: 'HIV viral load ', label: 'HIV viral load' });
    expect(apply(query, completion)).toBe('women with  HIV viral load ');
  });

  it('replaces a result word that begins the concept name, and the text reads as that test', () => {
    const query = 'women with mean corp';
    const completions = completionsFor(query, config, (words) => (words === 'corp' ? [mch, mcv] : undefined));
    expect(apply(query, completions[0])).toBe('women with Mean corpuscular hemoglobin ');
    expect(
      parseCohortCriteria(`${apply(query, completions[0]).trim()} < 30`, { ...config, tests: [mch, mcv] })?.criteria,
    ).toEqual([
      { type: 'demographics', gender: 'female' },
      { type: 'numericObs', concept: mch.uuid, operator: 'lt', value: 30 },
    ]);
  });

  it('offers nothing for a test before the lookup has answered, or when it found nothing', () => {
    expect(completionsFor('women with vir', config, () => undefined)).toEqual([]);
    expect(completionsFor('women with vir', config, () => [])).toEqual([]);
  });

  it("never completes a patient's name, which is never looked up", () => {
    let asked = false;
    expect(
      completionsFor('patients with Mary Ach', config, () => {
        asked = true;
        return [viralLoad];
      }),
    ).toEqual([]);
    expect(asked).toBe(false);
  });

  it('offers nothing for an empty question', () => {
    expect(completionsFor('', config, () => undefined)).toEqual([]);
  });

  it('skips a name too long to fit a completion with its trailing space, rather than cutting it', () => {
    const long: CohortTest = { ...viralLoad, label: `Viral ${'x'.repeat(114)}`, aliases: [] };
    expect(long.label).toHaveLength(120);
    expect(completionsFor('women with vir', config, () => [long, viralLoad]).map(({ label }) => label)).toEqual([
      'Viral load',
    ]);
  });

  it('keeps at most five', () => {
    const many = Array.from({ length: 8 }, (_, i) => ({
      uuid: `${String(i).padStart(8, '0')}-0000-4000-8000-000000000000`,
      label: `Viral thing ${i}`,
      aliases: [],
      units: '',
    }));
    expect(completionsFor('women with vir', config, () => many)).toHaveLength(5);
  });
});
