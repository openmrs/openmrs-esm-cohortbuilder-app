import type { Column, Patient, Query } from './types';

export const composeJson = (searchParameters) => {
  const query: Query = {
    type: 'org.openmrs.module.reporting.dataset.definition.PatientDataSetDefinition',
    columns: [],
    rowFilters: [],
    customRowFilterCombination: '',
  };
  query.columns = addColumnsToDisplay();
  let counter = 0;
  query.rowFilters = [];
  for (const field in searchParameters) {
    if (isNullValues(searchParameters[field])) {
      delete searchParameters[field];
      continue;
    }
    if (searchParameters[field] != 'all' && searchParameters != '') {
      query.rowFilters[counter] = {};
      query.rowFilters[counter].key = getDefinitionLibraryKey(field, searchParameters[field]);
    }
    if (Array.isArray(searchParameters[field])) {
      query.rowFilters[counter].parameterValues = getParameterValues(searchParameters[field]);
    }
    if (searchParameters[field].length >= 1 && searchParameters[field][0].livingStatus === 'alive') {
      query.rowFilters[counter].livingStatus = 'alive';
    }
    query.rowFilters[counter].type = 'org.openmrs.module.reporting.dataset.definition.PatientDataSetDefinition';
    counter += 1;
  }
  query.customRowFilterCombination = composeFilterCombination(query.rowFilters);
  return { query };
};

export const isNullValues = (fieldValues) => {
  if (Array.isArray(fieldValues) && fieldValues.length >= 1) {
    return !fieldValues[0].value;
  }
  return fieldValues === 'all' || !fieldValues;
};

export const getDefinitionLibraryKey = (field: string, value: string) => {
  let definitionLibraryKey = 'reporting.library.cohortDefinition.builtIn';
  switch (field) {
    case 'gender':
      definitionLibraryKey += `.${value}`;
      break;
    default:
      definitionLibraryKey += `.${field}`;
  }
  return definitionLibraryKey;
};

export const getParameterValues = (parameterFields) => {
  const parameter = {};
  parameterFields.forEach((eachParam) => {
    parameter[eachParam.name] = eachParam.value;
  });
  return parameter;
};

export const composeFilterCombination = (filterColumns) => {
  let compositionTitle = '';
  const totalNumber = filterColumns.length;
  for (let index = 1; index <= totalNumber; index++) {
    if (filterColumns[index - 1].livingStatus === 'alive') {
      compositionTitle += `NOT ${index}`;
      delete filterColumns[index - 1].livingStatus;
    } else {
      compositionTitle += `${index}`;
    }
    compositionTitle += index < totalNumber ? ' AND ' : '';
  }
  return compositionTitle;
};

export const addColumnsToDisplay = () => {
  const columns = [
    {
      name: 'firstname',
      key: 'preferredName.givenName',
    },
    {
      name: 'lastname',
      key: 'preferredName.familyName',
    },
    {
      name: 'gender',
      key: 'gender',
    },
    {
      name: 'age',
      key: 'ageOnDate.fullYears',
    },
    {
      name: 'patientId',
      key: 'patientId',
    },
  ];

  const columnValues = columns.map((aColumn: Column) => {
    aColumn.type = 'org.openmrs.module.reporting.data.patient.definition.PatientDataDefinition';
    aColumn.key = `reporting.library.patientDataDefinition.builtIn.${aColumn.key}`;
    return aColumn;
  });
  return columnValues;
};

export const addToHistory = (description: string, patients: Patient[], parameters: {}) => {
  const oldHistory = JSON.parse(window.sessionStorage.getItem('openmrsHistory'));
  let newHistory = [];

  if (oldHistory) {
    newHistory = [...oldHistory, { description, patients, parameters }];
  } else {
    newHistory = [{ description, patients, parameters }];
  }
  window.sessionStorage.setItem('openmrsHistory', JSON.stringify(newHistory));
};

export const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  const day = date.getDate();
  const month = date.getMonth() + 1;
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

/**
 * builds a query description based on query input
 * @param {object} state the current state
 * @param {string} conceptName the concept name
 * @returns {string} date in the required format
 */
export const queryDescriptionBuilder = (state, conceptName: string) => {
  const { timeModifier, onOrAfter, onOrBefore } = state;

  const onOrAfterDescription = onOrAfter ? `since ${formatDate(onOrAfter)}` : '';
  const onOrBeforeDescription = onOrBefore ? `until ${formatDate(onOrBefore)}` : '';

  return `Patients with ${timeModifier} ${conceptName} ${onOrAfterDescription} ${onOrBeforeDescription}`.trim();
};

const convertToCSV = (patients: Patient[]) => {
  const csv =
    'patient_id, full_name, age, gender\n' +
    patients
      .map((patient) => {
        const orderedPatient = {
          patientId: patient.patientId,
          name: patient.name,
          age: patient.age,
          gender: patient.gender,
        };

        return Object.keys(orderedPatient)
          .map((key) => {
            return `"${patient[key]}"`;
          })
          .join(',');
      })
      .join('\n');

  return csv;
};

export const downloadCSV = (data, filename) => {
  const blob = new Blob([convertToCSV(data)], {
    type: 'text/csv;charset=utf-8;',
  });
  const url = URL.createObjectURL(blob);

  const pom = document.createElement('a');
  pom.href = url;
  pom.setAttribute('download', filename);
  pom.click();
};
