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
  patientId: string;
  firstname: string;
  lastname: string;
  age: string;
  gender: string;
}
