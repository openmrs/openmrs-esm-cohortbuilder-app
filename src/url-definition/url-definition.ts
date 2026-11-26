import dayjs from 'dayjs';
import type { DropdownValue, DrugOrderDetails, SearchParams } from '../types';
import { composeQueries } from '../components/composition/composition.utils';
import * as demographics from '../components/search-by-demographics/search-by-demographics.utils';
import * as drugOrders from '../components/search-by-drug-orders/search-by-drug-orders.utils';
import * as encounters from '../components/search-by-encounters/search-by-encounters.utils';
import * as enrollments from '../components/search-by-enrollments/search-by-enrollments.utils';

// The URL contract is shared with the omnibar; see the README section
// "Opening the builder with a pre-filled definition".

export const URL_PARAMS = ['definition', 'cohort', 'query'] as const;

export const MAX_DEFINITION_BYTES = 4096;
const MAX_ENCODED_LENGTH = Math.ceil(MAX_DEFINITION_BYTES / 3) * 4;
export const MAX_LABEL_LENGTH = 200;
export const MAX_CRITERIA = 5;
export const MAX_PROGRAMS = 10;
export const MAX_DRUGS = 50;
export const MAX_ENCOUNTER_TYPES = 10;
export const MAX_AGE = 150;

// Standard uuids, plus 36-character CIEL-style ids such as "1065AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA".
const UUID_PATTERN = /^[0-9A-Za-z-]{36}$/;
const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const BASE64URL_PATTERN = /^[A-Za-z0-9_-]*$/;

export interface DemographicsCriterion {
  type: 'demographics';
  gender?: 'male' | 'female' | 'any';
  minAge?: number;
  maxAge?: number;
}

export interface EnrollmentCriterion {
  type: 'enrollment';
  programs: string[];
  enrolledOnOrAfter?: string;
  enrolledOnOrBefore?: string;
}

export interface DrugOrderCriterion {
  type: 'drugOrder';
  drugs: string[];
  activeOnOrAfter?: string;
  activeOnOrBefore?: string;
}

export interface EncounterCriterion {
  type: 'encounter';
  encounterTypes: string[];
}

export type Criterion = DemographicsCriterion | EnrollmentCriterion | DrugOrderCriterion | EncounterCriterion;

export interface CohortDefinition {
  v: 1;
  label?: string;
  criteria: Criterion[];
}

export type UrlRequest =
  | { type: 'definition'; definition: CohortDefinition }
  | { type: 'cohort'; uuid: string }
  | { type: 'query'; uuid: string };

export interface Search {
  searchParams: SearchParams;
  description: string;
}

/**
 * Why a link could not be opened. `key`, `defaultMessage` and `options` are passed to t();
 * `message` is the English text. The page shows the reasons a valid link failed to run; a link that
 * isn't valid shows only "This link isn't a valid cohort query", since its reason can quote the link.
 */
export class LinkError extends Error {
  constructor(
    readonly key: string,
    readonly defaultMessage: string,
    readonly options: Record<string, string | number> = {},
  ) {
    super(defaultMessage.replace(/{{(\w+)}}/g, (_, name) => String(options[name])));
  }
}

/**
 * Reads the single request the URL asks for (definition > cohort > query).
 * Returns null when none is present and throws a LinkError when it is invalid.
 */
export function readUrlRequest(params: URLSearchParams): UrlRequest | null {
  const [chosen, ...ignored] = URL_PARAMS.filter((name) => params.has(name));
  if (ignored.length) {
    console.warn(`Cohort builder: using "${chosen}" and ignoring ${ignored.map((name) => `"${name}"`).join(', ')}`);
  }

  const value = params.get(chosen);
  switch (chosen) {
    case 'definition':
      return { type: 'definition', definition: decodeDefinition(value) };
    case 'cohort':
    case 'query':
      if (!isUuid(value)) {
        throw new LinkError('linkParamNotUuid', '"{{param}}" must be a uuid', { param: chosen });
      }
      return { type: chosen, uuid: value };
    default:
      return null;
  }
}

export function decodeDefinition(encoded: string): CohortDefinition {
  if (encoded.length > MAX_ENCODED_LENGTH) {
    throw definitionTooLarge();
  }
  const json = decodeBase64Url(encoded);

  let definition: unknown;
  try {
    definition = JSON.parse(json);
  } catch {
    throw new LinkError('definitionNotJson', 'Definition is not valid JSON');
  }
  return validateDefinition(definition);
}

function decodeBase64Url(encoded: string): string {
  const unpadded = encoded.replace(/={1,2}$/, '');
  if (!BASE64URL_PATTERN.test(unpadded)) {
    throw notBase64Url();
  }
  const base64 = unpadded.replace(/-/g, '+').replace(/_/g, '/');

  let binary: string;
  try {
    binary = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '='));
  } catch {
    throw notBase64Url();
  }
  if (binary.length > MAX_DEFINITION_BYTES) {
    throw definitionTooLarge();
  }

  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    throw new LinkError('definitionNotUtf8', 'Definition is not valid UTF-8');
  }
}

const definitionTooLarge = () =>
  new LinkError('definitionTooLarge', 'Definition is larger than {{maxBytes}} bytes', {
    maxBytes: MAX_DEFINITION_BYTES,
  });

const notBase64Url = () => new LinkError('definitionNotBase64Url', 'Definition is not valid base64url');

/**
 * The inverse of decodeDefinition: unpadded base64url of the UTF-8 JSON. Null when decodeDefinition
 * would refuse the result, so a link the builder can't open is never made.
 */
export function encodeDefinition(definition: CohortDefinition): string | null {
  let binary = '';
  for (const byte of new TextEncoder().encode(JSON.stringify(definition))) {
    binary += String.fromCharCode(byte);
  }
  const encoded = btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  try {
    decodeDefinition(encoded);
  } catch {
    return null;
  }
  return encoded;
}

export function validateDefinition(value: unknown): CohortDefinition {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new LinkError('definitionNotObject', 'Definition must be a JSON object');
  }
  const unknownKey = findUnknownKey(value, ['v', 'label', 'criteria']);
  if (unknownKey !== undefined) {
    throw new LinkError('definitionUnknownKey', 'Definition has an unknown key "{{key}}"', { key: unknownKey });
  }
  const definition = value as Record<string, unknown>;

  if (definition.v !== 1) {
    throw new LinkError('definitionVersion', 'Definition version "v" must be 1');
  }
  if (
    definition.label !== undefined &&
    (typeof definition.label !== 'string' || definition.label.length > MAX_LABEL_LENGTH)
  ) {
    throw new LinkError('definitionLabel', '"label" must be text of at most {{max}} characters', {
      max: MAX_LABEL_LENGTH,
    });
  }
  if (
    !Array.isArray(definition.criteria) ||
    definition.criteria.length < 1 ||
    definition.criteria.length > MAX_CRITERIA
  ) {
    throw new LinkError('definitionCriteria', '"criteria" must list 1 to {{max}} criteria', { max: MAX_CRITERIA });
  }

  return {
    v: 1,
    label: definition.label as string | undefined,
    criteria: definition.criteria.map(validateCriterion),
  };
}

function validateCriterion(value: unknown, index: number): Criterion {
  const number = index + 1;
  const type = (value as { type?: unknown })?.type;

  switch (type) {
    case 'demographics': {
      const criterion = expectCriterionObject(value, number, ['type', 'gender', 'minAge', 'maxAge']);
      const { gender = 'any', minAge, maxAge } = criterion;
      if (gender !== 'male' && gender !== 'female' && gender !== 'any') {
        throw new LinkError('criterionGender', 'Criterion {{number}}: "gender" must be "male", "female" or "any"', {
          number,
        });
      }
      expectOptionalAge(minAge, number, 'minAge', 0);
      // The demographics builder treats an age of 0 as "no bound", which would turn maxAge 0 into "any age".
      expectOptionalAge(maxAge, number, 'maxAge', 1);
      if (minAge !== undefined && maxAge !== undefined && minAge > maxAge) {
        throw new LinkError('criterionAgeOrder', 'Criterion {{number}}: "minAge" must not be greater than "maxAge"', {
          number,
        });
      }
      if (gender === 'any' && minAge === undefined && maxAge === undefined) {
        throw new LinkError('criterionDemographicsEmpty', 'Criterion {{number}}: give a gender, "minAge" or "maxAge"', {
          number,
        });
      }
      return { type, gender, minAge: minAge as number | undefined, maxAge: maxAge as number | undefined };
    }
    case 'enrollment': {
      const criterion = expectCriterionObject(value, number, [
        'type',
        'programs',
        'enrolledOnOrAfter',
        'enrolledOnOrBefore',
      ]);
      const { programs, enrolledOnOrAfter, enrolledOnOrBefore } = criterion;
      expectUuids(programs, number, 'programs', MAX_PROGRAMS);
      expectOptionalDate(enrolledOnOrAfter, number, 'enrolledOnOrAfter', false);
      expectOptionalDate(enrolledOnOrBefore, number, 'enrolledOnOrBefore', false);
      return {
        type,
        programs: programs as string[],
        enrolledOnOrAfter: enrolledOnOrAfter as string | undefined,
        enrolledOnOrBefore: enrolledOnOrBefore as string | undefined,
      };
    }
    case 'drugOrder': {
      const criterion = expectCriterionObject(value, number, ['type', 'drugs', 'activeOnOrAfter', 'activeOnOrBefore']);
      const { drugs, activeOnOrAfter, activeOnOrBefore } = criterion;
      expectUuids(drugs, number, 'drugs', MAX_DRUGS);
      expectOptionalDate(activeOnOrAfter, number, 'activeOnOrAfter', true);
      expectOptionalDate(activeOnOrBefore, number, 'activeOnOrBefore', true);
      return {
        type,
        drugs: drugs as string[],
        activeOnOrAfter: activeOnOrAfter as string | undefined,
        activeOnOrBefore: activeOnOrBefore as string | undefined,
      };
    }
    case 'encounter': {
      const { encounterTypes } = expectCriterionObject(value, number, ['type', 'encounterTypes']);
      expectUuids(encounterTypes, number, 'encounterTypes', MAX_ENCOUNTER_TYPES);
      return { type, encounterTypes: encounterTypes as string[] };
    }
    default:
      throw new LinkError(
        'criterionType',
        'Criterion {{number}}: "type" must be "demographics", "enrollment", "drugOrder" or "encounter"',
        { number },
      );
  }
}

function findUnknownKey(value: object, allowedKeys: string[]) {
  return Object.keys(value).find((key) => !allowedKeys.includes(key));
}

function expectCriterionObject(value: unknown, number: number, allowedKeys: string[]): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new LinkError('criterionNotObject', 'Criterion {{number}} must be a JSON object', { number });
  }
  const unknownKey = findUnknownKey(value, allowedKeys);
  if (unknownKey !== undefined) {
    throw new LinkError('criterionUnknownKey', 'Criterion {{number}} has an unknown key "{{key}}"', {
      number,
      key: unknownKey,
    });
  }
  return value as Record<string, unknown>;
}

function expectOptionalAge(value: unknown, number: number, field: string, min: number) {
  if (value !== undefined && (!Number.isInteger(value) || (value as number) < min || (value as number) > MAX_AGE)) {
    throw new LinkError(
      'criterionAge',
      'Criterion {{number}}: "{{field}}" must be a whole number from {{min}} to {{max}}',
      { number, field, min, max: MAX_AGE },
    );
  }
}

function expectUuids(value: unknown, number: number, field: string, max: number) {
  if (!Array.isArray(value) || value.length < 1 || value.length > max || !value.every(isUuid)) {
    throw new LinkError('criterionUuids', 'Criterion {{number}}: "{{field}}" must list 1 to {{max}} uuids', {
      number,
      field,
      max,
    });
  }
}

function expectOptionalDate(value: unknown, number: number, field: string, allowToday: boolean) {
  if (value === undefined || (allowToday && value === 'today') || isIsoDate(value)) {
    return;
  }
  if (allowToday) {
    throw new LinkError(
      'criterionDateOrToday',
      'Criterion {{number}}: "{{field}}" must be "today" or a date like 2024-01-31',
      { number, field },
    );
  }
  throw new LinkError('criterionDate', 'Criterion {{number}}: "{{field}}" must be a date like 2024-01-31', {
    number,
    field,
  });
}

export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_PATTERN.test(value);
}

function isIsoDate(value: unknown): boolean {
  const match = typeof value === 'string' && ISO_DATE_PATTERN.exec(value);
  if (!match) {
    return false;
  }
  const [, year, month, day] = match.map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

/**
 * Turns "today" or YYYY-MM-DD into the same local-midnight string the builder's date pickers produce.
 * "today" is resolved when this is called, so shared links stay relative.
 */
export function toQueryDate(value: string | undefined): string {
  if (value === undefined) {
    return '';
  }
  return (value === 'today' ? dayjs() : dayjs(value)).startOf('day').format();
}

/**
 * Builds the reportingrest query and history description for one criterion using the
 * same builders as the search tabs. `names` maps program/drug uuids to display names;
 * missing ones are counted instead, as in "Lamivudine and 2 more drugs".
 */
export function buildSearch(
  criterion: Criterion,
  names: Map<string, string>,
  drugOrderSearchDefinitionKey: string,
): Search {
  switch (criterion.type) {
    case 'demographics': {
      const params = demographicsValues(criterion);
      return { searchParams: demographics.getQueryDetails(params), description: demographics.getDescription(params) };
    }
    case 'enrollment': {
      const params = enrollmentValues(criterion, names);
      return {
        searchParams: enrollments.getQueryDetails(params),
        description: enrollments.getDescription({
          ...params,
          selectedPrograms: toDescribedValues(criterion.programs, names, 'program', 'programs'),
        }),
      };
    }
    case 'drugOrder': {
      const params = drugOrderValues(criterion, names);
      return {
        searchParams: drugOrders.getQueryDetails(params, drugOrderSearchDefinitionKey),
        description: drugOrders.getDescription({
          ...params,
          selectedDrugs: toDescribedValues(criterion.drugs, names, 'drug', 'drugs'),
        }),
      };
    }
    case 'encounter': {
      // The encounters tab with only its types chosen: any number of encounters, at any time and place.
      const params = {
        selectedEncounterTypes: toDropdownValues(criterion.encounterTypes, names),
        encounterForms: [],
        encounterLocations: [],
        atLeastCount: 0,
        atMostCount: 0,
        onOrAfter: '',
        onOrBefore: '',
      };
      return {
        searchParams: encounters.getQueryDetails(params),
        description: encounters.getDescription({
          ...params,
          selectedEncounterTypes: toDescribedValues(
            criterion.encounterTypes,
            names,
            'encounter type',
            'encounter types',
          ),
        }),
      };
    }
  }
}

/** What the search tabs hold for a definition; each tab searches for exactly what buildSearch does. */
export interface FormValues {
  demographics?: demographics.Demographics;
  enrollment?: enrollments.EnrollmentsSearchParams;
  drugOrder?: DrugOrderDetails;
}

/**
 * Fills each tab with the first criterion of its type, since a tab holds one search. Programs and
 * drugs are labelled with `names`, or with their uuid when the name is missing.
 */
export function toFormValues({ criteria }: CohortDefinition, names: Map<string, string>): FormValues {
  const first = <T extends Criterion['type']>(type: T) =>
    criteria.find((criterion): criterion is Extract<Criterion, { type: T }> => criterion.type === type);
  const demographicsCriterion = first('demographics');
  const enrollmentCriterion = first('enrollment');
  const drugOrderCriterion = first('drugOrder');
  return {
    demographics: demographicsCriterion && demographicsValues(demographicsCriterion),
    enrollment: enrollmentCriterion && enrollmentValues(enrollmentCriterion, names),
    drugOrder: drugOrderCriterion && drugOrderValues(drugOrderCriterion, names),
  };
}

function demographicsValues(criterion: DemographicsCriterion): demographics.Demographics {
  return {
    gender: { male: 'males', female: 'females', any: 'all' }[criterion.gender],
    // The demographics tab reads an age of 0 as "no bound".
    minAge: criterion.minAge ?? 0,
    maxAge: criterion.maxAge ?? 0,
    birthDayStartDate: '',
    birthDayEndDate: '',
    livingStatus: 'alive',
  };
}

function enrollmentValues(
  criterion: EnrollmentCriterion,
  names: Map<string, string>,
): enrollments.EnrollmentsSearchParams {
  return {
    enrolledOnOrAfter: toQueryDate(criterion.enrolledOnOrAfter),
    enrolledOnOrBefore: toQueryDate(criterion.enrolledOnOrBefore),
    completedOnOrAfter: '',
    completedOnOrBefore: '',
    selectedPrograms: toDropdownValues(criterion.programs, names),
    selectedLocations: null,
  };
}

function drugOrderValues(criterion: DrugOrderCriterion, names: Map<string, string>): DrugOrderDetails {
  return {
    selectedDrugs: toDropdownValues(criterion.drugs, names),
    selectedCareSetting: null,
    activeOnOrAfter: toQueryDate(criterion.activeOnOrAfter),
    activeOnOrBefore: toQueryDate(criterion.activeOnOrBefore),
    activatedOnOrAfter: '',
    activatedOnOrBefore: '',
  };
}

/** A definition's description: each criterion's, as its search tab words it, ANDed. */
export function describeSearches(searches: Search[]): string {
  return searches.map(({ description }) => description).join(' AND ');
}

/**
 * The whole definition as one search: what a link runs last, its criteria's searches composed as the
 * Composition tab composes them, so a count of it is the count the builder then shows.
 */
export function definitionSearch(
  { criteria }: CohortDefinition,
  names: Map<string, string>,
  drugOrderSearchDefinitionKey: string,
): Search {
  const searches = criteria.map((criterion) => buildSearch(criterion, names, drugOrderSearchDefinitionKey));
  if (searches.length === 1) {
    return searches[0];
  }
  return {
    searchParams: composeQueries(searches.map(({ searchParams }) => searchParams.query)),
    description: describeSearches(searches),
  };
}

function toDropdownValues(uuids: string[], names: Map<string, string>): DropdownValue[] {
  return uuids.map((uuid, index) => ({ id: index, label: names.get(uuid) ?? uuid, value: uuid }));
}

function toDescribedValues(
  uuids: string[],
  names: Map<string, string>,
  singular: string,
  plural: string,
): DropdownValue[] {
  const named = toDropdownValues(
    uuids.filter((uuid) => names.has(uuid)),
    names,
  );
  const missing = uuids.length - named.length;
  if (missing === 0) {
    return named;
  }
  const noun = missing === 1 ? singular : plural;
  const label = named.length ? `${missing} more ${noun}` : `${missing} ${noun}`;
  return [...named, { id: named.length, label, value: '' }];
}
