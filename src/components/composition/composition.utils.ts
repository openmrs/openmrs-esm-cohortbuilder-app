import { addColumnsToDisplay } from '../../cohort-builder.utils';
import type { Query } from '../../types';

const tokenizeComposition = (search: string) =>
  search
    .replace(/([()])/g, ' $1 ')
    .trim()
    .split(/\s+/);

export const isCompositionValid = (search: string) => {
  return tokenizeComposition(search).every((token) => /^(and|or|not|union|intersection|\d+|[()!+])$/i.test(token));
};

const formatFilterCombination = (filterText: string, numberOfSearches: number) => {
  return filterText.replace(/\d+/g, (filterNumber) => (parseInt(filterNumber) + numberOfSearches).toString());
};

export const createCompositionQuery = (compositionQuery: string) => {
  const query: Query = {
    type: 'org.openmrs.module.reporting.dataset.definition.PatientDataSetDefinition',
    columns: addColumnsToDisplay(),
    rowFilters: [],
    customRowFilterCombination: '',
  };

  const searchTokens = tokenizeComposition(compositionQuery);

  searchTokens.forEach((eachToken) => {
    if (eachToken.match(/\d/)) {
      const history = JSON.parse(window.sessionStorage.getItem('openmrsHistory'));
      const operandQuery = history[parseInt(eachToken) - 1];

      const jsonRequestObject = operandQuery.parameters;
      jsonRequestObject.customRowFilterCombination = formatFilterCombination(
        jsonRequestObject.customRowFilterCombination,
        query.rowFilters.length,
      );
      query.customRowFilterCombination += `(${jsonRequestObject.customRowFilterCombination})`;
      query.rowFilters = query.rowFilters.concat(jsonRequestObject.rowFilters);
    } else {
      query.customRowFilterCombination += ` ${eachToken} `;
    }
  });

  return { query };
};
