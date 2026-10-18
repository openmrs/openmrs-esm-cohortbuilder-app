import { beforeEach, describe, expect, it, vi } from 'vitest';
import { openmrsFetch } from '@openmrs/esm-framework';
import { getCohortMembers, getDataSet } from './cohort-builder.resources';

const mockOpenmrsFetch = vi.mocked(openmrsFetch);
const cohortUuid = 'f4c0b5a2-3c84-4c76-bb7e-6c1b1b2e5a11';

const patientUuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const membership = (n: number, overrides = {}) => ({
  uuid: `membership-${n}`,
  patientUuid: patientUuid(n),
  startDate: '2020-01-01T00:00:00.000+0000',
  endDate: null,
  voided: false,
  ...overrides,
});
const details = (n: number) => ({
  patientId: n,
  person: { gender: 'F', age: 30, preferredName: { givenName: 'Patient', familyName: `${n}` } },
});

let membershipPages: Array<ReturnType<typeof membership>[]>;
let patientDetails: (n: number) => Promise<unknown>;

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-17T12:00:00Z'));
  patientDetails = async (n) => details(n);
  mockOpenmrsFetch.mockImplementation(async (url: string) => {
    if (url.includes(`/cohort/${cohortUuid}/membership?`)) {
      const page = Number(new URL(url, 'http://x').searchParams.get('startIndex')) / 100;
      const results = membershipPages[page] ?? [];
      const links = page < membershipPages.length - 1 ? [{ rel: 'next' }] : [];
      return { data: { results, links } } as never;
    }
    const n = Number(url.match(/patient\/0{8}-0{4}-4000-8000-(\d{12})/)[1]);
    return { data: await patientDetails(n) } as never;
  });
});

const fetchedPatients = () => mockOpenmrsFetch.mock.calls.filter(([url]) => url.includes('/patient/')).length;

describe('getCohortMembers', () => {
  it('reads every membership page and shows active members', async () => {
    const firstPage = Array.from({ length: 100 }, (_, i) => membership(i + 1));
    membershipPages = [firstPage, [membership(101)]];

    const patients = await getCohortMembers(cohortUuid);

    expect(patients).toHaveLength(101);
    expect(patients[100]).toEqual({
      id: '101',
      patientId: 101,
      name: 'Patient 101',
      firstname: 'Patient',
      lastname: '101',
      age: 30,
      gender: 'F',
    });
    expect(mockOpenmrsFetch).toHaveBeenCalledWith(expect.stringContaining('&startIndex=100'));
  });

  it('loads the members 6 at a time', async () => {
    membershipPages = [0, 1, 2].map((page) => Array.from({ length: 100 }, (_, i) => membership(page * 100 + i + 1)));
    let inFlight = 0;
    let mostInFlight = 0;
    patientDetails = async (n) => {
      inFlight++;
      mostInFlight = Math.max(mostInFlight, inFlight);
      await Promise.resolve();
      inFlight--;
      return details(n);
    };

    const patients = await getCohortMembers(cohortUuid);

    expect(patients).toHaveLength(300);
    expect(fetchedPatients()).toBe(300);
    expect(mostInFlight).toBe(6);
  });

  it('stops paging when a page adds no new memberships', async () => {
    const samePage = Array.from({ length: 100 }, (_, i) => membership(i + 1));
    // A server that ignores startIndex returns the same page with a "next" link forever.
    membershipPages = Array(50).fill(samePage);

    const patients = await getCohortMembers(cohortUuid);

    expect(patients).toHaveLength(100);
    expect(mockOpenmrsFetch.mock.calls.filter(([url]) => url.includes('/membership'))).toHaveLength(2);
  });

  it('leaves out voided, not yet started and ended memberships', async () => {
    membershipPages = [
      [
        membership(1),
        membership(2, { voided: true }),
        membership(3, { startDate: '2026-10-18T00:00:00.000+0000' }),
        membership(4, { endDate: '2026-10-16T00:00:00.000+0000' }),
        membership(5, { endDate: '2026-10-17T12:00:00.000+0000' }),
        membership(6, { startDate: null }),
      ],
    ];

    const patients = await getCohortMembers(cohortUuid);

    expect(patients.map(({ patientId }) => patientId)).toEqual([1, 5, 6]);
  });

  it('reads membership dates with a colonless offset where Date cannot, as Safari', async () => {
    const SystemDate = Date;
    // Safari's JavaScriptCore gives an Invalid Date for an offset without a colon, such as +0000.
    class SafariDate extends SystemDate {
      constructor(...args: ConstructorParameters<typeof Date> | []) {
        if (typeof args[0] === 'string' && /[+-]\d{4}$/.test(args[0])) {
          super(NaN);
        } else {
          super(...(args as []));
        }
      }
    }
    vi.stubGlobal('Date', SafariDate);
    membershipPages = [
      [
        membership(1),
        membership(2, { endDate: '2026-10-16T00:00:00.000+0000' }),
        membership(3, { endDate: '2026-10-18T00:00:00.000+0000' }),
        membership(4, { startDate: '2026-10-17T13:00:00.000+0100' }),
        membership(5, { startDate: '2026-10-17T14:00:00.000+0100' }),
      ],
    ];

    try {
      const patients = await getCohortMembers(cohortUuid);
      expect(patients.map(({ patientId }) => patientId)).toEqual([1, 3, 4]);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('leaves out a membership with a bound that is not a date, without failing the others', async () => {
    membershipPages = [
      [
        membership(1),
        membership(2, { startDate: 123 }),
        membership(3, { startDate: {} }),
        membership(4, { startDate: ['2020-01-01T00:00:00.000+0000'] }),
        membership(5, { startDate: '' }),
        membership(6, { endDate: '' }),
        membership(7, { endDate: 0 }),
        membership(8, { endDate: false }),
        membership(9, { endDate: true }),
        membership(10, { endDate: 'soon' }),
        membership(11, { endDate: '2026-10-16T00:00:00.000+0000' }),
        membership(12, { voided: true }),
        membership(13, { startDate: undefined, endDate: undefined }),
      ],
    ];

    const patients = await getCohortMembers(cohortUuid);

    expect(patients.map(({ patientId }) => patientId)).toEqual([1, 13]);
  });

  it('skips members that cannot be loaded or shown', async () => {
    membershipPages = [[membership(1), membership(2), membership(3)]];
    patientDetails = async (n) => {
      if (n === 2) {
        throw new Error('Not found');
      }
      return n === 3 ? { ...details(3), person: { ...details(3).person, preferredName: null } } : details(n);
    };

    const patients = await getCohortMembers(cohortUuid);

    expect(patients.map(({ patientId }) => patientId)).toEqual([1]);
    expect(fetchedPatients()).toBe(3);
  });

  it('names each member with only the parts of a name they have', async () => {
    membershipPages = [[membership(1), membership(2)]];
    patientDetails = async (n) => ({
      ...details(n),
      person: { ...details(n).person, preferredName: { givenName: n === 1 ? 'Ann' : null, familyName: null } },
    });

    const patients = await getCohortMembers(cohortUuid);

    expect(patients.map(({ name }) => name)).toEqual(['Ann', '']);
  });

  it('fails when the cohort has active members but none can be shown', async () => {
    membershipPages = [[membership(1), membership(2)]];
    patientDetails = async () => {
      throw new Error('Not found');
    };

    await expect(getCohortMembers(cohortUuid)).rejects.toThrow("None of the cohort's members could be loaded");
  });

  it('shows an empty cohort as no members', async () => {
    membershipPages = [[membership(1, { voided: true })]];

    expect(await getCohortMembers(cohortUuid)).toEqual([]);
  });
});

describe('getDataSet', () => {
  it('names each patient with only the parts of a name they have', async () => {
    const row = (patientId: number, firstname: string | null, lastname: string | null) => ({
      patientId,
      firstname,
      lastname,
    });
    mockOpenmrsFetch.mockResolvedValue({
      data: { rows: [row(1, null, null), row(2, 'Ann', null), row(3, null, 'Banda'), row(4, 'Ann', 'Banda')] },
    } as never);

    const patients = await getDataSet('query-uuid');

    expect(patients.map(({ name }) => name)).toEqual(['', 'Ann', 'Banda', 'Ann Banda']);
  });
});
