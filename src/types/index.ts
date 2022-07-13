export interface SearchParams {
  query: Query;
}

export interface Query {
  type: string;
  columns: Column[];
  rowFilters: RowFilters[];
  customRowFilterCombination: string;
  name?: string;
  description?: string;
}

export interface RowFilters {
  key?: string;
  parameterValues?: {};
  livingStatus?: string;
  type?: string;
}

export interface Column {
  name: string;
  key: string;
  type?: string;
}

export interface Patient {
  id: string;
  name: string;
  age: number;
  gender: string;
  firstname?: string;
  lastname?: string;
  patientId?: number;
}

export interface Concept {
  uuid: string;
  units: string;
  answers: string[];
  hl7Abbrev: string;
  name: string;
  description: string;
  datatype: DataType;
}

export interface DataType {
  uuid: string;
  hl7Abbreviation: string;
  description: string;
  name: string;
}

export interface Cohort {
  uuid?: string;
  display: string;
  name: string;
  description: string;
  memberIds: number[];
}

export interface SearchHistoryItem {
  id: string;
  parameters?: Query;
  results: string;
  description: string;
  patients: Patient[];
}

export interface PaginationData {
  page: number;
  pageSize: number;
}

export interface DropdownValue {
  id: number;
  label: string;
  value: string;
}

export interface PersonAttribute extends DropdownValue {}

export interface Location extends DropdownValue {}

export interface Form extends DropdownValue {}

export interface EncounterType extends DropdownValue {}

export interface SearchByProps {
  onSubmit: (
    searchParams: SearchParams,
    queryDescription: string
  ) => Promise<boolean>;
}

export interface Response {
  uuid: string;
  display: string;
}

export interface PersonAttributeResponse extends Response {}

export interface LocationResponse extends Response {}

export interface FormResponse extends Response {}

export interface EncounterTypeResponse extends Response {}

export interface EncounterDetails {
  onOrAfter: string;
  onOrBefore: string;
  atLeastCount: number;
  atMostCount: number;
  encounterForm: Form;
  encounterLocation: Location;
  selectedEncounterTypes: EncounterType[];
}
