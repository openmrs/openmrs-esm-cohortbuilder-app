import { describe, expect, it } from 'vitest';
import { composeJson, formatDate } from './cohort-builder.utils';

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

it('shows the picked day west of UTC', () => {
    const originalTz = process.env.TZ;
    process.env.TZ = 'America/New_York';
    
    expect(formatDate('2024-12-31')).toBe('31/12/2024');
    
    if (originalTz === undefined) {
      delete process.env.TZ;
    } else {
      process.env.TZ = originalTz;
    }
  });
});
