import { addColumnsToDisplay } from '../../cohort-builder.utils';
import type { Query } from '../../types';

const tokenizeComposition = (search: string) =>
  search
    .replace(/([()])/g, ' $1 ')
    .trim()
    .split(/\s+/);

export const isCompositionValid = (search: string) => {
  return tokenizeComposition(search).every((token) => /^(and|or|not|union|intersection|\d+|[()])$/i.test(token));
};

const formatFilterCombination = (filterText: string, numberOfSearches: number) => {
  return filterText.replace(/\d+/g, (filterNumber) => (parseInt(filterNumber) + numberOfSearches).toString());
};

/**
 * Composes the tokens of `compositionQuery`: each number becomes that operand's filters, renumbered past
 * the filters already in the query and bracketed. `operand` returns a fresh copy on every call, since
 * the copy's numbering is rewritten.
 */
const composeOperands = (compositionQuery: string, operand: (position: number) => Query) => {
  const query: Query = {
    type: 'org.openmrs.module.reporting.dataset.definition.PatientDataSetDefinition',
    columns: addColumnsToDisplay(),
    rowFilters: [],
    customRowFilterCombination: '',
  };

  const searchTokens = tokenizeComposition(compositionQuery);

  searchTokens.forEach((eachToken) => {
    if (eachToken.match(/\d/)) {
      const jsonRequestObject = operand(parseInt(eachToken));
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

export const createCompositionQuery = (compositionQuery: string) =>
  composeOperands(
    compositionQuery,
    (position) => JSON.parse(window.sessionStorage.getItem('openmrsHistory'))[position - 1].parameters,
  );

/** ANDs queries in hand exactly as the Composition tab ANDs the same searches from the history. */
export const composeQueries = (queries: Array<Query>) =>
  composeOperands(queries.map((_, index) => index + 1).join(' AND '), (position) =>
    JSON.parse(JSON.stringify(queries[position - 1])),
  );
