import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { getSessionStore, openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';
import type { Query } from '../types';
import { isUuid } from '../url-definition/url-definition';
import { isPlainObject } from './saved-search.resource';

/**
 * Counts a cohort without fetching a row per member, as the builder's own search does. A definition
 * that is one program enrollment search asks reportingrest's evaluated cohort resource for its `ref`
 * representation, which carries the count and no members. Anything else is evaluated as the ad hoc
 * query the builder would run, with `v=rowFilters` and no columns: reportingrest then returns the
 * matching ids without evaluating any data for them, and the count is how many there are. Those ids,
 * internal patient ids for the composition and for each of its filters, do reach the browser, though
 * only their number is read: reportingrest has no count-only evaluation for a composition yet, and
 * `v=count` is proposed for it (the cohort counts brief, step 5).
 *
 * The enrollment search is the one built-in definition whose other parameters are optional, so a GET
 * can leave them out; the age and encounter definitions require every parameter on a GET.
 */

const enrollmentKey = 'reporting.library.cohortDefinition.builtIn.patientsWithEnrollment';

/** The programs, when the query is exactly one enrollment search by programs alone. */
function enrollmentPrograms({ rowFilters, customRowFilterCombination }: Query): Array<string> | null {
  if (rowFilters.length !== 1 || rowFilters[0].key !== enrollmentKey || customRowFilterCombination.trim() !== '1') {
    return null;
  }
  // As the request would carry them: the search tabs leave unset parameters undefined.
  const { programs, ...others } = JSON.parse(JSON.stringify(rowFilters[0].parameterValues ?? {}));
  return Object.keys(others).length === 0 && Array.isArray(programs) && programs.length > 0 && programs.every(isUuid)
    ? programs
    : null;
}

/** An answer that doesn't say how many: a plain error, never shown. */
export class UnreadableCountError extends Error {}

function readCount(value: unknown): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) {
    throw new UnreadableCountError('The count could not be read');
  }
  return value;
}

export async function countCohort(query: Query, signal?: AbortSignal): Promise<number> {
  const programs = enrollmentPrograms(query);
  if (programs) {
    const params = new URLSearchParams({ v: 'ref' });
    programs.forEach((program) => params.append('programs', program));
    const { data } = await openmrsFetch<unknown>(`${restBaseUrl}/reportingrest/cohort/${enrollmentKey}?${params}`, {
      signal,
    });
    return readCount(isPlainObject(data) ? data.count : undefined);
  }

  const { data } = await openmrsFetch<unknown>(`${restBaseUrl}/reportingrest/adhocquery?v=rowFilters`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: { ...query, columns: [] },
    signal,
  });
  const memberIds = isPlainObject(data) && isPlainObject(data.result) ? data.result.memberIds : undefined;
  if (!Array.isArray(memberIds)) {
    throw new UnreadableCountError('The count could not be read');
  }
  return memberIds.length;
}

const maxCachedCounts = 50;
const maxReasks = 3;
// For the session: a count is asked for once per key. The key carries the day, since ages and "today" move.
const counts = new Map<string, number>();
let countsUser: string | undefined;

/** Who is logged in now, from the framework's session store; never suspends, unlike useSession. */
const currentUser = (): string | undefined => getSessionStore().getState().session?.user?.uuid;

/**
 * The counts remembered for whoever is logged in now. Another user, or none, starts afresh: a logout
 * without a page load leaves this module loaded, and one user's counts are theirs alone.
 */
function rememberedCounts(): Map<string, number> {
  const user = currentUser();
  if (user !== countsUser) {
    counts.clear();
    countsUser = user;
  }
  return counts;
}

function remember(key: string, count: number, askedBy: string | undefined) {
  const counts = rememberedCounts();
  if (askedBy !== countsUser) {
    return;
  }
  counts.delete(key);
  counts.set(key, count);
  if (counts.size > maxCachedCounts) {
    counts.delete(counts.keys().next().value);
  }
}

export interface CohortCountState {
  key: string | null;
  /** Who the state is for. */
  user: string | undefined;
  count?: number;
  loading: boolean;
  error: boolean;
  /** The server couldn't be reached or failed to answer. */
  unavailable: boolean;
}

const settled = (key: string | null, user: string | undefined, count?: number): CohortCountState => ({
  key,
  user,
  count,
  loading: false,
  error: false,
  unavailable: false,
});

/**
 * Settled with the remembered count, or loading for a key not yet counted. Called while rendering, so
 * it may forget the previous user's counts there: repeating that changes nothing.
 */
const initial = (key: string | null, user: string | undefined) =>
  key && rememberedCounts().has(key)
    ? settled(key, user, counts.get(key))
    : { ...settled(key, user), loading: Boolean(key) };

const subscribeToSession = (onChange: () => void) => getSessionStore().subscribe(onChange);

/**
 * The count of `query`, asked for once the same `key` has been in place for `delayMs`, so the server
 * isn't asked per keystroke. A key the user has moved past is aborted and its answer ignored. The
 * query is read when the count is asked for; one key must always stand for the same cohort.
 *
 * A count is only ever shown to the user who asked for it: when someone else logs in, the count is
 * asked again for them at once, up to maxReasks times in a row, so a session that keeps changing ends
 * in a plain error rather than a loop.
 */
export function useCohortCount(key: string | null, query: Query | null, delayMs: number): CohortCountState {
  const user = useSyncExternalStore(subscribeToSession, currentUser);
  const [state, setState] = useState<CohortCountState>(() => initial(key, user));
  const queryRef = useRef(query);
  queryRef.current = query;
  const asked = useRef({ key, user, reasks: 0 });

  useEffect(() => {
    const reask = asked.current.key === key && asked.current.user !== user;
    asked.current = { key, user, reasks: reask ? asked.current.reasks + 1 : 0 };
    if (!key || !queryRef.current || rememberedCounts().has(key)) {
      setState(initial(key, user));
      return;
    }
    if (asked.current.reasks > maxReasks) {
      setState({ ...settled(key, user), error: true });
      return;
    }

    setState(initial(key, user));
    const controller = new AbortController();
    // An answer that arrives after the user changed is dropped: the change asks again.
    const ask = () =>
      countCohort(queryRef.current, controller.signal).then(
        (count) => {
          if (controller.signal.aborted || user !== currentUser()) return;
          remember(key, count, user);
          asked.current.reasks = 0;
          setState(settled(key, user, count));
        },
        (error: unknown) => {
          if (controller.signal.aborted || user !== currentUser()) return;
          setState({ ...settled(key, user), error: true, unavailable: !(error instanceof UnreadableCountError) });
        },
      );
    const timer = reask ? undefined : setTimeout(ask, Math.max(0, delayMs));
    if (reask) {
      ask();
    }

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [key, delayMs, user]);

  // Until the effect has caught up with a new key or user, the old state answers a different question.
  return state.key === key && state.user === user ? state : initial(key, user);
}
