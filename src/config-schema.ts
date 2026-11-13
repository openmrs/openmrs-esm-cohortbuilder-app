import { type PhraseAdditions } from './omnibar/phrases/phrase-table';
import { Type, validator } from '@openmrs/esm-framework';

// The RefApp demo programs (Initializer configuration/programs). Program uuids are site content, so other
// distros replace these. "art" is both an HIV program alias here and an ARV drug alias: the parser tells
// them apart by grammar ("enrolled in ART" / "in ART program" vs "on ART"), never by guessing.
const COHORT_PROGRAMS_DEFAULT = [
  {
    uuid: '64f950e6-1b07-4ac0-8e7e-f3e148f3463f',
    label: 'HIV Care and Treatment',
    aliases: ['hiv', 'hiv care', 'art', 'hiv care and treatment'],
  },
  { uuid: 'd1b6cd43-8ac7-4cdd-8fb4-fe51635c82b4', label: 'PMTCT', aliases: ['pmtct'] },
  {
    uuid: 'ac1bbc45-8c35-49ff-a574-9553ff789527',
    label: 'HIV Preventative Services (PEP/PrEP)',
    aliases: ['prep', 'pep', 'hiv prevention'],
  },
  {
    uuid: '7a72a724-8994-4d33-962e-f65d8ca4ae67',
    label: 'Outpatient Diabetes Education Program',
    aliases: ['diabetes', 'diabetes education'],
  },
];

// Drug uuids are site content. The ARV ones are the formulary rows on the RefApp demo server; elsewhere
// they match nothing until a distro replaces them. The demo has no TLD Drug, so "on TLD" stays silent.
const COHORT_DRUG_GROUPS_DEFAULT = [
  {
    id: 'arv',
    label: 'ARVs',
    aliases: ['arv', 'arvs', 'art', 'antiretroviral', 'antiretrovirals'],
    drugUuids: [
      '8891ef84-08d3-5e23-8d81-f7a528a2591d', // Tenofovir
      '24c7b6a7-c317-588f-a50c-9ca12535388b', // Lamivudine
      'bfc93568-c9de-5a7b-998a-a57ea3af7e02', // Efavirenz
      '0216ff5f-7e98-5425-944b-e4792cfaea8c', // Nevirapine
      '5e0fb4d1-0a76-570c-aa23-9ab3e68f2d5e', // Abacavir
      'ff7cbf4a-ceb3-5044-9c02-02808f310dea', // Retrovir (zidovudine)
      '9247a9cd-6790-51b4-868f-aa83a740d617', // Stavudine
      '274aae77-31d2-53a0-9a2d-ec941d4e9624', // Didanosine
      '0800fada-8a96-52ac-ab8a-68f6f5cb119c', // Nelfinavir
      'b3a3db36-ba89-52fc-b35c-b26eb6b99324', // Lamivudine / zidovudine
      '8cea863d-e8a5-5b56-8269-162b444c309a', // Lamivudine / nevirapine / stavudine
      'bf171285-1691-11df-97a5-7038c432aabf', // Triomune-30
      '4d2618fd-5be3-5a4c-ad4b-58b8b2ed0a13', // Lopinavir / ritonavir
    ],
    cielConceptUuids: [
      '84796AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', // tenofovir disoproxil
      '78643AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', // lamivudine
      '165085AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', // dolutegravir
      'b944c518-10b4-4a93-a928-d0e4d10a66e4', // dolutegravir / lamivudine / tenofovir (CIEL 170671)
      '75523AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', // efavirenz
      '86663AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', // zidovudine
      '80586AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', // nevirapine
      '794AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', // lopinavir / ritonavir
      '70056AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', // abacavir
      '161361AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', // efavirenz / lamivudine / tenofovir
      '159809AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', // atazanavir / ritonavir
    ],
  },
  {
    id: 'tld',
    label: 'TLD',
    aliases: ['tld', 'tenofovir lamivudine dolutegravir'],
    drugUuids: [],
    cielConceptUuids: ['b944c518-10b4-4a93-a928-d0e4d10a66e4'],
  },
];

export const configSchema = {
  drugOrderSearchDefinitionKey: {
    _type: Type.String,
    _default: 'reporting.library.cohortDefinition.builtIn.drugOrderSearch',
    _description:
      'Reporting definition library key used for drug order searches. Stock reporting modules do not ship ' +
      '"builtIn.drugOrderSearch"; a site can add its own DrugOrderCohortDefinition to ' +
      'configuration/reporting/definitionLibraries/cohort/drugOrderSearch.reportingserializerxml and set this to ' +
      '"configuration.definitionlibrary.cohort.drugOrderSearch".',
  },
  drugCriteriaEnabled: {
    _type: Type.Boolean,
    _default: false,
    _description:
      "Whether the server can run drug order searches, so the omnibar's cohort row understands drug groups " +
      '("on ARVs"). Off by default: the drug order search uses drugOrderSearchDefinitionKey, and its default ' +
      'key is defined by no reporting release, so the search fails. Turn this on once reporting defines it, or ' +
      'once the site installs its own DrugOrderCohortDefinition and sets drugOrderSearchDefinitionKey to it.',
  },
  omnibar: {
    enabled: {
      _type: Type.Boolean,
      _default: true,
      _description:
        'Offer cohort rows in the omnibar: a patient count for text such as "how many women aged 15-49", a ' +
        'link to the Cohort Builder, and saved cohorts and saved queries by name. They show only where an ' +
        'omnibar is installed. Off, every row stays empty and nothing is fetched. Removing the providers ' +
        'from "omnibar-providers-slot" in config works too.',
    },
    savedSearchMinCharacters: {
      _type: Type.Number,
      _default: 2,
      _description:
        'Characters needed before saved cohorts and saved queries are searched by name: at least 1, so an empty ' +
        'query is never searched.',
      _validators: [validator((value: number) => value >= 1, 'Must be at least 1.')],
    },
    serverVocabulary: {
      _type: Type.Boolean,
      _default: true,
      _description:
        'Let the cohort row know the programs and encounter types on the server by name, with the names of each ' +
        "program's concept in the user's language and English, besides those in programs and encounterTypes. " +
        'Asked for once per user when the row is first allowed to answer, never per keystroke. Off, only config is known.',
    },
    countDebounceMs: {
      _type: Type.Number,
      _default: 600,
      _description:
        'How long, in milliseconds, the question in the omnibar must stay the same cohort before the count row ' +
        'asks the server to count it. Typing that only changes the wording, such as "how many", keeps waiting ' +
        'for the same count.',
      _validators: [validator((value: number) => value >= 0, 'Must not be negative.')],
    },
    programs: {
      _type: Type.Array,
      _description:
        'Programs the omnibar\'s cohort row understands, as in "enrolled in HIV program". Aliases are matched as ' +
        'whole words.',
      _elements: {
        _type: Type.Object,
        uuid: { _type: Type.UUID, _description: 'The program uuid.' },
        label: { _type: Type.String, _description: 'Shown in the cohort description.' },
        aliases: { _type: Type.Array, _elements: { _type: Type.String }, _default: [] },
      },
      _default: COHORT_PROGRAMS_DEFAULT,
    },
    drugGroups: {
      _type: Type.Array,
      _description:
        'Drug groups the omnibar\'s cohort row understands while drugCriteriaEnabled is on, as in "on ARVs". ' +
        '"on <alias>" means a drug order for any of drugUuids that is active today. A group with no drugUuids ' +
        'is never offered.',
      _elements: {
        _type: Type.Object,
        id: { _type: Type.String },
        label: { _type: Type.String, _description: 'Shown in the cohort description.' },
        aliases: { _type: Type.Array, _elements: { _type: Type.String }, _default: [] },
        drugUuids: {
          _type: Type.Array,
          _elements: { _type: Type.String },
          _default: [],
          _description: 'Drug (formulary) uuids, which is what the drug order search looks for.',
        },
        cielConceptUuids: {
          _type: Type.Array,
          _elements: { _type: Type.String },
          _default: [],
          _description: 'The CIEL concepts the group stands for, as a reference for filling in drugUuids. Not sent.',
        },
      },
      _default: COHORT_DRUG_GROUPS_DEFAULT,
    },
    phrases: {
      _description:
        "Phrases this site adds to the cohort parser's English table (src/omnibar/phrases/en.json), list by list: " +
        'for example "under": ["younger then"] or "stopwords": ["mwili"]. Comparators are named after the FHIR search ' +
        'prefixes: under (lt), atMost (le), over (gt), atLeast (ge) and aged (eq) come before the number; orUnder (le) ' +
        'and orOver (ge) after it. A stopword holding "not", "or" or another negation or alternative is ignored, and ' +
        'so is a phrase longer than 80 characters. ageGroups adds named age bands, such as ' +
        '{"phrases": ["school age"], "minAge": 6, "maxAge": 12}. Additions only: nothing in the shipped table can be removed.',
      stopwords: { _type: Type.Array, _elements: { _type: Type.String }, _default: [] },
      female: { _type: Type.Array, _elements: { _type: Type.String }, _default: [] },
      male: { _type: Type.Array, _elements: { _type: Type.String }, _default: [] },
      under: { _type: Type.Array, _elements: { _type: Type.String }, _default: [] },
      atMost: { _type: Type.Array, _elements: { _type: Type.String }, _default: [] },
      over: { _type: Type.Array, _elements: { _type: Type.String }, _default: [] },
      atLeast: { _type: Type.Array, _elements: { _type: Type.String }, _default: [] },
      aged: { _type: Type.Array, _elements: { _type: Type.String }, _default: [] },
      orUnder: { _type: Type.Array, _elements: { _type: Type.String }, _default: [] },
      orOver: { _type: Type.Array, _elements: { _type: Type.String }, _default: [] },
      rangeFrom: { _type: Type.Array, _elements: { _type: Type.String }, _default: [] },
      rangeTo: { _type: Type.Array, _elements: { _type: Type.String }, _default: [] },
      years: { _type: Type.Array, _elements: { _type: Type.String }, _default: [] },
      yearsOld: { _type: Type.Array, _elements: { _type: Type.String }, _default: [] },
      months: { _type: Type.Array, _elements: { _type: Type.String }, _default: [] },
      otherUnits: { _type: Type.Array, _elements: { _type: Type.String }, _default: [] },
      enrolled: { _type: Type.Array, _elements: { _type: Type.String }, _default: [] },
      programLinkers: { _type: Type.Array, _elements: { _type: Type.String }, _default: [] },
      programNouns: { _type: Type.Array, _elements: { _type: Type.String }, _default: [] },
      drugVerbs: { _type: Type.Array, _elements: { _type: Type.String }, _default: [] },
      encounterNouns: { _type: Type.Array, _elements: { _type: Type.String }, _default: [] },
      ageGroups: {
        _type: Type.Array,
        _default: [],
        _elements: {
          _type: Type.Object,
          phrases: { _type: Type.Array, _elements: { _type: Type.String }, _default: [] },
          minAge: { _type: Type.Number, _description: 'Whole years, 0 to 150.' },
          maxAge: { _type: Type.Number, _description: 'Whole years, 0 to 150.' },
          gender: { _type: Type.String, _description: '"female" or "male", or leave it out.' },
          source: { _type: Type.String, _description: 'Where the bounds come from. Not shown.' },
        },
      },
    },
    encounterTypes: {
      _type: Type.Array,
      _description:
        'Encounter types the omnibar\'s cohort row understands, as in "patients with an admission encounter". ' +
        'The word "encounter" is needed after the alias. Encounter type uuids are site content, so none ship.',
      _elements: {
        _type: Type.Object,
        uuid: { _type: Type.UUID, _description: 'The encounter type uuid.' },
        label: { _type: Type.String, _description: 'Shown in the cohort description.' },
        aliases: { _type: Type.Array, _elements: { _type: Type.String }, _default: [] },
      },
      _default: [],
    },
  },
};

export interface CohortProgram {
  uuid: string;
  label: string;
  aliases: Array<string>;
}

export interface CohortDrugGroup {
  id: string;
  label: string;
  aliases: Array<string>;
  drugUuids: Array<string>;
  cielConceptUuids: Array<string>;
}

export interface CohortEncounterType {
  uuid: string;
  label: string;
  aliases: Array<string>;
}

export interface ConfigObject {
  drugOrderSearchDefinitionKey: string;
  drugCriteriaEnabled: boolean;
  omnibar: {
    enabled: boolean;
    savedSearchMinCharacters: number;
    serverVocabulary: boolean;
    countDebounceMs: number;
    programs: Array<CohortProgram>;
    drugGroups: Array<CohortDrugGroup>;
    encounterTypes: Array<CohortEncounterType>;
    phrases?: PhraseAdditions;
  };
}
