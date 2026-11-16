import { describe, expect, it } from 'vitest';
import { completionsFor } from './completions';
import { type CohortCriteriaConfig, parseCohortCriteria, unreadWords } from './parse-cohort-criteria';
import { toTests } from './test-lookup.resource';

/**
 * dev3-shaped CIEL labs (BasicLabTests v25, with 856 reduced to its only dev3 English name
 * "HIV viral load"). The search is what OpenMRS concept search does: every typed word is a prefix
 * of some word in a name. The row is what the parser then reads.
 */
const labs = [
  {
    ciel: '21',
    uuid: '21AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    display: 'Haemoglobin',
    units: 'g/dL',
    names: [
      'Haemoglobin',
      'Hémoglobine',
      'Kiwango Cha Damu',
      'Hgb',
      'Hb',
      'Hemoglobin',
      'Emoglobin',
      'ہیموگلوبن',
      'Hemoglobin performed on blood',
      'Medición de concentración de hemoglobina total',
    ],
  },
  {
    ciel: '790',
    uuid: '790AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    display: 'Serum creatinine (umol/L)',
    units: 'umol/L',
    names: ['Serum creatinine (umol/L)', 'Créatinine', 'Cr', 'Kreyatinin', 'Créatinine'],
  },
  {
    ciel: '851',
    uuid: '851AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    display: 'Mean corpuscular volume',
    units: 'fL',
    names: [
      'Mean corpuscular volume',
      'Mcv',
      'Volume globulaire moyen',
      'Mwayen volim globulè',
      'VGM',
      'Determinación del volumen corpuscular medio',
      'Determinación del VCM',
    ],
  },
  {
    ciel: '856',
    uuid: '856AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    display: 'HIV viral load',
    units: 'copies/ml',
    names: ['HIV viral load'],
  },
  {
    ciel: '1015',
    uuid: '1015AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    display: 'Hematocrit',
    units: '%',
    names: [
      'Hematocrit',
      'Hématocrite',
      'ni kiasi cha chembe chembe nyeundu za damu mwilini',
      'Hct',
      'Crit',
      'Packed cell volume',
      'PCV',
      'Ematokrit',
    ],
  },
  {
    ciel: '1017',
    uuid: '1017AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    display: 'Mean cell hemoglobin concentration',
    units: 'g/dL',
    names: [
      'Mean cell hemoglobin concentration',
      'MCHC',
      'Moyenne hémoglobine cellulaire concentration',
      'Konsantrasyon mwayen emoglobin selilè',
      'CCMH',
      'Determinación de la concentración de hemoglobina corpuscular media',
      'Determinación de la CHCM',
      'Concentración eritrocítica de hemoglobina corpuscular media',
      'Determinación de CHCM',
    ],
  },
  {
    ciel: '1018',
    uuid: '1018AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    display: 'Mean corpuscular hemoglobin',
    units: 'pg',
    names: [
      'Mean corpuscular hemoglobin',
      'MCH',
      'Hémoglobine corpusculaires moyenne',
      'Mwayen emoglobin globulè',
      'TCMH',
      'Determinación de hemoglobina corpuscular media',
      'Determinación de HCM',
    ],
  },
  {
    ciel: '5497',
    uuid: '5497AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    display: 'CD4 count',
    units: 'cells/uL',
    names: [
      'Taux de CD4',
      'CD4 count',
      'CD4',
      'CD3+CD4+abs cnt',
      'Numération des lymphocytes CD4',
      'Nivo CD4',
      'Recuento absoluto de células CD4',
    ],
  },
  {
    ciel: '164364',
    uuid: '164364AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    display: 'Serum creatinine (mg/dL)',
    units: 'mg/dL',
    names: ['Serum creatinine (mg/dL)', 'Kreyatinin (mg/dL)', 'Cr (mg/dl)', 'Créatinine sérique (mg/dL)'],
  },
];

const byUuid = new Map(labs.map((lab) => [lab.uuid, lab]));

/** Concept search by word prefix, then the same reading `toTests` gives the parser. */
function search(words: string) {
  const wanted = words.toLowerCase().split(/\s+/).filter(Boolean);
  const hits = labs.filter((lab) => {
    const nameWords = [lab.display, ...lab.names]
      .flatMap((name) =>
        name
          .toLowerCase()
          .normalize('NFKC')
          .split(/[^\p{L}\p{N}]+/u),
      )
      .filter(Boolean);
    return wanted.every((part) => nameWords.some((word) => word.startsWith(part)));
  });
  return toTests({
    results: hits.map((lab) => ({
      uuid: lab.uuid,
      display: lab.display,
      units: lab.units,
      datatype: { hl7Abbreviation: 'NM' },
      names: lab.names.map((name) => ({ name, locale: 'en' })),
    })),
  });
}

const base: CohortCriteriaConfig = { drugCriteriaEnabled: false, programs: [], drugGroups: [] };

function asked(text: string) {
  let tests: ReturnType<typeof search> = [];
  const queries: Array<string> = [];
  const known = new Map<string, ReturnType<typeof search>>();
  for (let step = 0; step < 5; step++) {
    const words = unreadWords(text, { ...base, tests });
    if (!words) break;
    if (!known.has(words)) {
      queries.push(words);
      known.set(words, search(words));
    }
    const found = known.get(words).filter((test) => !tests.some((have) => have.uuid === test.uuid));
    if (!found.length) break;
    tests = [...tests, ...found];
  }
  const definition = parseCohortCriteria(text, { ...base, tests });
  const row = definition
    ? definition.criteria
        .map((clause) => {
          if (clause.type === 'demographics') return clause.gender ?? 'any';
          if (clause.type !== 'numericObs') return clause.type;
          const lab = byUuid.get(clause.concept);
          const window = clause.withinLastMonths
            ? ` ${clause.withinLastMonths}mo`
            : clause.withinLastDays
            ? ` ${clause.withinLastDays}d`
            : clause.onOrAfter
            ? ` from ${clause.onOrAfter}`
            : '';
          return `${lab?.ciel ?? clause.concept} ${clause.which ?? 'latest'} ${clause.operator} ${
            clause.value
          }${window}`;
        })
        .join(' + ')
    : 'no row';
  const completions = completionsFor(text, { ...base, tests }, search).map(
    (completion) => text.slice(0, text.length - completion.replace) + completion.insert,
  );
  return { queries, row, completions };
}

describe('CIEL lab phrases', () => {
  it.each([
    ['mean corpuscular volume < 80', '851 latest lt 80', ['corpuscular volume']],
    ['mean corpuscular hemoglobin over 30', '1018 latest gt 30', ['corpuscular hemoglobin']],
    ['women with mcv under 80', 'female + 851 latest lt 80', ['mcv']],
    ['mean viral load > 1000', '856 average gt 1000', ['viral load']],
    ['average mean corpuscular volume below 80', '851 average lt 80', ['mean corpuscular volume']],
    [
      'lowest mean corpuscular volume under 75 in the last 6 months',
      '851 lowest lt 75 6mo',
      ['mean corpuscular volume'],
    ],
    [
      'women with mean cell hemoglobin concentration under 32',
      'female + 1017 latest lt 32',
      ['cell hemoglobin concentration'],
    ],
    ['women with mch under 30', 'female + 1018 latest lt 30', ['mch']],
    ['mchc under 32', '1017 latest lt 32', ['mchc']],
    ['cd4 under 200', '5497 latest lt 200', ['cd4']],
    ['cd4 count under 200', '5497 latest lt 200', ['cd4 count']],
    ['hemoglobin under 8', '21 latest lt 8', ['hemoglobin']],
    ['packed cell volume under 30', '1015 latest lt 30', ['packed cell volume']],
    ['haemoglobin under 10.5', '21 latest lt 10.5', ['haemoglobin']],
    ['viral load over 1,000', '856 latest gt 1000', ['viral load']],
    ['hiv viral load ever above 1000', '856 any gt 1000', ['hiv viral load']],
    ['viral load ever above 1000', '856 any gt 1000', ['viral load']],
    ['patients with a viral load over 1000', '856 latest gt 1000', ['viral load']],
    ['hiv viral load ever over 1,000 in the last 6 months', '856 any gt 1000 6mo', ['hiv viral load']],
    ['any viral load above 1000', '856 any gt 1000', ['viral load']],
    ['viral load > 1000 since 2025', '856 latest gt 1000 from 2025-01-01', ['viral load']],
    ['highest hiv viral load over 1000', '856 highest gt 1000', ['hiv viral load']],
    ['load over 1000', 'no row', ['load']],
    ['volume < 80', 'no row', ['volume']],
    ['patients with Mary Achieng', 'no row', []],
    ['corpuscular < 80', 'no row', ['corpuscular']],
    ['count under 200', 'no row', []],
    ['women with mean', 'no row', []],
    ['creatinine under.30', 'no row', []],
    ['serum creatinine under 100', 'no row', ['serum creatinine']],
    ['cr under 100', 'no row', ['cr']],
  ])('%s reads %s', (text, row, queries) => {
    expect(asked(text)).toMatchObject({ row, queries });
  });

  it('completes mean corp as the concept name, and that text is the test', () => {
    const text = 'women with mean corp';
    const { queries, completions } = asked(text);
    expect(queries).toEqual(['corp']);
    expect(completions[0]).toBe('women with Mean corpuscular volume ');
    expect(asked(`${completions[0].trim()} < 80`).row).toBe('female + 851 latest lt 80');
  });

  it('completes vir as HIV viral load, and that text is the test', () => {
    const text = 'women with vir';
    const { queries, completions } = asked(text);
    expect(queries).toEqual(['vir']);
    expect(completions[0]).toBe('women with HIV viral load ');
    expect(asked(`${completions[0].trim()} over 1000`).row).toBe('female + 856 latest gt 1000');
  });

  // "creatinine" is one letter from the whole name "Créatinine" on 790 (µmol/L), so the one-slip
  // rule reads it. A value of 0.9 in µmol/L is the wrong unit. Left as-is on purpose: the two-word
  // suffix guard is not loosened here. "mg/dL" gives no row, because that unit is not 790's.
  it.each([
    ['creatinine under .9', '790 latest lt 0.9', ['creatinine']],
    ['creatinine < .9 mg/dL', 'no row', ['creatinine', 'mg/dl']],
    ['creatinine under 0.9', '790 latest lt 0.9', ['creatinine']],
    ['creatinine under 1.', '790 latest lt 1', ['creatinine']],
    ['creatinine under .9.', '790 latest lt 0.9', ['creatinine']],
  ] as const)('reads bare creatinine in %s as %s', (text, row, queries) => {
    expect(asked(text)).toMatchObject({ row, queries });
  });
});
