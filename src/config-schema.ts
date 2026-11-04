import { Type } from '@openmrs/esm-framework';

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
};

export interface ConfigObject {
  drugOrderSearchDefinitionKey: string;
}
