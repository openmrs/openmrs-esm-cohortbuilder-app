export interface Notification {
  kind:
    | "error"
    | "info"
    | "info-square"
    | "success"
    | "warning"
    | "warning-alt";
  title: string;
}

export interface Concept {
  uuid: string;
  display: string;
  name: Name;
  datatype: ConceptClass;
  conceptClass: ConceptClass;
  set: boolean;
  version: string;
  retired: boolean;
  names: Name[];
  descriptions: Description[];
  mappings: any[];
  answers: any[];
  setMembers: any[];
  auditInfo: AuditInfo;
  hiNormal: number;
  lowNormal: number;
  units: string;
  allowDecimal: boolean;
  attributes: any[];
  links: Link[];
  resourceVersion: string;
}

export interface AuditInfo {
  creator: ChangedBy;
  dateCreated: string;
  changedBy: ChangedBy;
  dateChanged: string;
}

export interface ChangedBy {
  uuid: string;
  display: string;
  links: Link[];
}

export interface Link {
  rel: Rel;
  uri: string;
  resourceAlias: string;
}

export enum Rel {
  Full = "full",
  Self = "self",
}

export interface ConceptClass {
  uuid: string;
  display: string;
  name: string;
  description: string;
  retired: boolean;
  links: Link[];
  resourceVersion: string;
  hl7Abbreviation?: string;
}

export interface Description {
  display: string;
  uuid: string;
  description: string;
  locale: string;
  links: Link[];
  resourceVersion: string;
}

export interface Name {
  display: string;
  uuid: string;
  name: string;
  locale: string;
  localePreferred: boolean;
  conceptNameType: null;
  links: Link[];
  resourceVersion: string;
}
