import { describe, expect, it } from 'vitest';
import { composeJson, convertToCSV, queryDescriptionBuilder } from './cohort-builder.utils';
import type { Patient } from './types';

describe('composeJson', () => {
  it('requests the preferred patient identifier for search results', () => {
    const { query } = composeJson({});

    expect(query.columns).toContainEqual(
      expect.objectContaining({
        name: 'identifier',
        key: 'reporting.library.patientDataDefinition.builtIn.preferredIdentifier.identifier',
      }),
    );
  });
});

describe('convertToCSV', () => {
  const patient: Patient = { id: '7', patientId: 7, name: 'Asha Rao', age: 34, gender: 'F' };

  it('writes a header and one quoted row for each patient', () => {
    expect(convertToCSV([patient])).toBe('patient_id,full_name,age,gender\n"7","Asha Rao","34","F"');
  });

  it('doubles a quote inside a value so that it stays in one column', () => {
    expect(convertToCSV([{ ...patient, name: 'Asha "Ash" Rao' }])).toBe(
      'patient_id,full_name,age,gender\n"7","Asha ""Ash"" Rao","34","F"',
    );
  });

  it('leaves a missing value empty', () => {
    expect(convertToCSV([{ ...patient, age: null }])).toBe('patient_id,full_name,age,gender\n"7","Asha Rao","","F"');
  });

  it('keeps an age of 0', () => {
    expect(convertToCSV([{ ...patient, age: 0 }])).toBe('patient_id,full_name,age,gender\n"7","Asha Rao","0","F"');
  });
});

describe('queryDescriptionBuilder', () => {
  it('formats numeric concepts with an operator and value', () => {
    const description = queryDescriptionBuilder(
      {
        timeModifier: 'ANY',
        operator1: 'LESS_THAN',
        value1: '60',
      },
      'Weight (kg)',
    );

    expect(description).toBe('Patients with ANY Weight (kg) < 60');
  });

  it('formats numeric concepts with value 0', () => {
    const description = queryDescriptionBuilder(
      {
        timeModifier: 'ANY',
        operator1: 'EQUAL',
        value1: '0',
      },
      'Weight (kg)',
    );

    expect(description).toBe('Patients with ANY Weight (kg) = 0');
  });

  it('omits operator if no numeric value was entered', () => {
    const description = queryDescriptionBuilder(
      {
        timeModifier: 'ANY',
        operator1: 'LESS_THAN',
        value1: '',
      },
      'Weight (kg)',
    );

    expect(description).toBe('Patients with ANY Weight (kg)');
  });
});
