import { describe, expect, it } from 'vitest';
import { getQueryDetails } from './search-by-drug-orders.utils';

describe('getQueryDetails', () => {
  it('searches with the given definition library key', () => {
    const { query } = getQueryDetails(
      {
        selectedDrugs: [{ id: 0, label: 'Triomune-30', value: '3cfcf118-931c-46f7-8ff6-7b876f0d4202' }],
        selectedCareSetting: null,
        activeOnOrAfter: '',
        activeOnOrBefore: '',
        activatedOnOrAfter: '',
        activatedOnOrBefore: '',
      },
      'configuration.definitionlibrary.cohort.drugOrderSearch',
    );

    expect(query.rowFilters).toEqual([
      {
        key: 'configuration.definitionlibrary.cohort.drugOrderSearch',
        parameterValues: { drugs: ['3cfcf118-931c-46f7-8ff6-7b876f0d4202'] },
        type: 'org.openmrs.module.reporting.dataset.definition.PatientDataSetDefinition',
      },
    ]);
    expect(query.customRowFilterCombination).toBe('1');
  });
});
