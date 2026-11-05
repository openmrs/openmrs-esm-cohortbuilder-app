import { describe, expect, it } from 'vitest';
import { composeJson, queryDescriptionBuilder } from './cohort-builder.utils';

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