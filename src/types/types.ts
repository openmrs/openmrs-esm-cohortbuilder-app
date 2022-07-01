export interface SearchParams {
  query: Query;
}

export interface Query {
  type: string;
  columns: Column[];
  rowFilters: RowFilters[];
  customRowFilterCombination: string;
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
  age: string;
  gender: string;
  firstname?: string;
  lastname?: string;
  patientId?: string;
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
