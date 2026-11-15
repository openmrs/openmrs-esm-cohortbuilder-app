import { describe, it, expect } from 'vitest';
import { type EncounterDetails } from '../../types';
import { getDescription } from './search-by-encounters.utils';

const emptyDetails: EncounterDetails = {
  onOrAfter: '',
  onOrBefore: '',
  atLeastCount: 0,
  atMostCount: 0,
  encounterForms: [],
  encounterLocations: [],
  selectedEncounterTypes: [],
};

describe('getDescription', () => {
  it('uses "Type" for a single encounter type', () => {
    const description = getDescription({
      ...emptyDetails,
      selectedEncounterTypes: [{ id: 0, label: 'Vitals', value: 'vitals-uuid' }],
    });

    expect(description).toBe('Patients with Encounter of Type Vitals');
  });

  it('uses "Types" and joins the last two encounter types with "and"', () => {
    const description = getDescription({
      ...emptyDetails,
      selectedEncounterTypes: [
        { id: 0, label: 'Admission', value: 'admission-uuid' },
        { id: 1, label: 'Vitals', value: 'vitals-uuid' },
        { id: 2, label: 'Visit Note', value: 'visit-note-uuid' },
      ],
    });

    expect(description).toBe('Patients with Encounter of Types Admission, Vitals and Visit Note');
  });

  it('describes any type when no encounter type is selected', () => {
    expect(getDescription(emptyDetails)).toBe('Patients with Encounter of any Type');
  });

  it('does not add an extra space before "at most"', () => {
    expect(getDescription({ ...emptyDetails, atLeastCount: 2, atMostCount: 5 })).toBe(
      'Patients with Encounter of any Type at least 2 times and at most 5 times',
    );
    expect(getDescription({ ...emptyDetails, atMostCount: 1 })).toBe(
      'Patients with Encounter of any Type at most 1 time',
    );
  });
});
