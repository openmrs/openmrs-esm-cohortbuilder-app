import { afterEach, describe, expect, it } from 'vitest';
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
}); // <-- This closing bracket ends composeJson before formatDate starts!

describe('formatDate', () => {
  const originalTz = process.env.TZ;

  afterEach(() => {
    if (originalTz === undefined) {
      delete process.env.TZ;
    } else {
      process.env.TZ = originalTz;
    }
  });

  it('shows the picked day west of UTC', () => {
    process.env.TZ = 'America/New_York';
    expect(formatDate('2024-12-31')).toBe('31/12/2024');
  });
});
