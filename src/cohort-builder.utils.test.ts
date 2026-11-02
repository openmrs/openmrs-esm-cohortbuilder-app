import { describe, expect, it } from 'vitest';
import { composeJson } from './cohort-builder.utils';

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
