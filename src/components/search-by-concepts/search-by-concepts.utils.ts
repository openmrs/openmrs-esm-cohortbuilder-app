import dayjs from 'dayjs';
import { composeJson, formatDate } from '../../cohort-builder.utils';
import type { Concept } from '../../types';

/** The reporting search for each concept datatype the tab offers, by HL7 abbreviation. */
const searchByDatatype = {
  CWE: 'codedObsSearchAdvanced',
  NM: 'numericObsSearchAdvanced',
  DT: 'dateObsSearchAdvanced',
  ST: 'dateObsSearchAdvanced',
  TS: 'textObsSearchAdvanced',
  ZZ: 'codedObsSearchAdvanced',
  BIT: 'codedObsSearchAdvanced',
};

const operatorSymbols = {
  LESS_THAN: '<',
  LESS_EQUAL: '<=',
  EQUAL: '=',
  GREATER_EQUAL: '>=',
  GREATER_THAN: '>',
};

const resultWords = {
  ANY: 'any',
  NO: 'no',
  FIRST: 'earliest',
  LAST: 'most recent',
  MIN: 'lowest',
  MAX: 'highest',
  AVG: 'average',
};

export interface ConceptSearch {
  concept: Pick<Concept, 'uuid' | 'name' | 'hl7Abbrev' | 'units'>;
  /** ANY, NO, FIRST, LAST, MIN, MAX or AVG. */
  timeModifier: string;
  /** For a numeric concept: LESS_THAN, LESS_EQUAL, EQUAL, GREATER_EQUAL or GREATER_THAN. */
  operator?: string;
  /** In the concept's units. Without a value there is no comparison. */
  value?: number;
  onOrAfter?: string;
  onOrBefore?: string;
  /** "Within the last" months and days: results from that many before now, which replaces onOrAfter. */
  withinLastMonths?: number;
  withinLastDays?: number;
}

const isNumeric = ({ concept }: ConceptSearch) => concept.hl7Abbrev === 'NM';

const hasComparison = (search: ConceptSearch) =>
  isNumeric(search) && Boolean(operatorSymbols[search.operator]) && Number.isFinite(search.value);

/** The start of the window: "within the last" counted back from now, else the chosen date. */
function startOf({ withinLastMonths = 0, withinLastDays = 0, onOrAfter }: ConceptSearch): string | undefined {
  if (withinLastMonths > 0 || withinLastDays > 0) {
    // Days, then months, as the Concepts tab always has.
    return dayjs().subtract(withinLastDays, 'days').subtract(withinLastMonths, 'months').format();
  }
  return onOrAfter || undefined;
}

export function getQueryDetails(search: ConceptSearch) {
  const { concept, timeModifier, operator, value, onOrBefore } = search;
  const onOrAfter = startOf(search);
  const parameters = [
    { name: 'timeModifier', value: timeModifier },
    { name: 'question', value: concept.uuid },
    ...(hasComparison(search)
      ? [
          { name: 'operator1', value: operator },
          { name: 'value1', value: String(value) },
        ]
      : []),
    ...(onOrAfter ? [{ name: 'onOrAfter', value: onOrAfter }] : []),
    ...(onOrBefore ? [{ name: 'onOrBefore', value: onOrBefore }] : []),
  ];
  return composeJson({ [searchByDatatype[concept.hl7Abbrev] ?? 'codedObsSearchAdvanced']: parameters });
}

/** "Patients with most recent HIV viral load > 1000 copies/mL since 4/6/2026". */
export function getDescription(search: ConceptSearch): string {
  const { concept, timeModifier, operator, value, onOrBefore } = search;
  const onOrAfter = startOf(search);
  return [
    'Patients with',
    resultWords[timeModifier] ?? timeModifier,
    concept.name,
    hasComparison(search) && `${operatorSymbols[operator]} ${value}`,
    hasComparison(search) && concept.units,
    onOrAfter && `since ${formatDate(onOrAfter)}`,
    onOrBefore && `until ${formatDate(onOrBefore)}`,
  ]
    .filter(Boolean)
    .join(' ');
}
