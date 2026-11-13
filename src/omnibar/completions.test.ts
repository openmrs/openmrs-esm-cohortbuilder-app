import { describe, expect, it } from 'vitest';
import { completionsFor } from './completions';
import { type CohortCriteriaConfig, type CohortTest } from './parse-cohort-criteria';

const tb = '9f144a34-3a4a-44a9-8486-6b7af6cc64f6';
const mch = '0b8c3c4e-2f9a-4b1e-9d5c-1a2b3c4d5e6f';
const hiv = '64f950e6-1b07-4ac0-8e7e-f3e148f3463f';

const config: CohortCriteriaConfig = {
  drugCriteriaEnabled: false,
  drugGroups: [],
  programs: [
    { uuid: tb, label: 'Tuberculosis Program', aliases: ['TB'] },
    { uuid: mch, label: 'Maternal and Child Health Programme', aliases: ['Maternal and Child Health'] },
    { uuid: hiv, label: 'HIV Care and Treatment', aliases: ['HIV'] },
  ],
};

const viralLoad: CohortTest = {
  uuid: '856AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
  label: 'HIV viral load',
  aliases: ['Viral load'],
  units: 'copies/mL',
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

  it('completes a program after "enrolled in" from the known programs, with no request', () => {
    const query = 'women enrolled in tub';
    const completions = completionsFor(query, config, () => undefined);
    expect(completions).toEqual([{ insert: 'Tuberculosis Program ', replace: 3, label: 'Tuberculosis Program' }]);
    expect(apply(query, completions[0])).toBe('women enrolled in Tuberculosis Program ');
  });

  it('completes several words of a program name, and every program that starts that way', () => {
    expect(completionsFor('enrolled in the maternal and ch', config, () => undefined)).toEqual([
      { insert: 'Maternal and Child Health Programme ', replace: 15, label: 'Maternal and Child Health Programme' },
    ]);
    expect(completionsFor('in the h', config, () => undefined).map(({ label }) => label)).toEqual([
      'HIV Care and Treatment',
    ]);
  });

  it('offers nothing once the question reads, or for words that start nothing', () => {
    expect(completionsFor('women enrolled in Tuberculosis Program', config, () => undefined)).toEqual([]);
    expect(completionsFor('women enrolled in xyz', config, () => undefined)).toEqual([]);
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
