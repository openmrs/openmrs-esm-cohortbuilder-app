import { beforeEach, describe, expect, it } from 'vitest';
import { formatDate } from '@openmrs/esm-framework';
import { getDescription } from './search-by-drug-orders.utils';

describe('getDescription', () => {
  beforeEach(() => {
    const zone = process.env.TZ;
    process.env.TZ = 'America/New_York';
    return () => {
      process.env.TZ = zone;
    };
  });

  it('describes calendar days as those days in a browser behind UTC', () => {
    const day = (date: Date) => formatDate(date, { mode: 'standard' });

    expect(
      getDescription({
        selectedDrugs: [{ id: 0, label: 'Aspirin', value: 'aspirin' }],
        selectedCareSetting: null,
        activeOnOrAfter: '2026-11-13',
        activeOnOrBefore: '2026-11-16',
        activatedOnOrAfter: '',
        activatedOnOrBefore: '',
      }),
    ).toBe(`Patients who are taking Aspirin from ${day(new Date(2026, 10, 13))} to ${day(new Date(2026, 10, 16))}`);
  });
});
