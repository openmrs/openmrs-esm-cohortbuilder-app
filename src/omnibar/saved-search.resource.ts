import { useEffect, useState } from 'react';
import { openmrsFetch } from '@openmrs/esm-framework';
import { isUuid } from '../url-definition/url-definition';
import { isServerUnreachable } from './omnibar-contract';

/**
 * Name search for saved cohorts and saved queries. Waits for typing to pause, aborts a request the
 * user has typed past, and remembers answers for a minute so backspacing doesn't refetch and a
 * cohort saved meanwhile still turns up soon.
 */

export interface SavedSearchHit {
  uuid: string;
  name: string;
  description?: string;
  /** Members, for saved cohorts. */
  size?: number;
}

/**
 * Answers can come from any server version or proxy. The mappers check that an entry is an object
 * before reading it, and keep a field only when it has the type the row needs.
 */
export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Text with something to see: not empty once spaces and format characters such as U+200B are gone. */
export function hasVisibleText(value: unknown): value is string {
  return typeof value === 'string' && value.replace(/\p{Cf}/gu, '').trim() !== '';
}

/** The text, or nothing when it isn't text, so a row never carries an object for the host to draw. */
export function textOrNothing(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

export const savedSearchDelayMs = 250;
export const savedSearchCacheMs = 60_000;
const maxCachedSearches = 50;
const cache = new Map<string, { hits: Array<SavedSearchHit>; at: number }>();

function remember(url: string, hits: Array<SavedSearchHit>) {
  cache.delete(url);
  cache.set(url, { hits, at: Date.now() });
  if (cache.size > maxCachedSearches) {
    cache.delete(cache.keys().next().value);
  }
}

function recall(url: string): Array<SavedSearchHit> | undefined {
  const entry = cache.get(url);
  return entry && Date.now() - entry.at < savedSearchCacheMs ? entry.hits : undefined;
}

interface SavedSearchState {
  url: string | null;
  hits: Array<SavedSearchHit>;
  loading: boolean;
  error: boolean;
  /** The request failed because the server couldn't be reached. */
  unavailable: boolean;
}

// One empty list, so a search with nothing in it doesn't look new on every render.
const noHits: Array<SavedSearchHit> = [];

const settled = (url: string | null, hits = noHits): SavedSearchState => ({
  url,
  hits,
  loading: false,
  error: false,
  unavailable: false,
});

/**
 * `toHits` must be a module-level function. Hits whose uuid the cohort builder wouldn't accept are
 * dropped here, before any URL is built from them.
 */
export function useSavedSearch(url: string | null, toHits: (data: unknown) => Array<SavedSearchHit>) {
  const [state, setState] = useState<SavedSearchState>(settled(null));

  useEffect(() => {
    if (!url) {
      setState(settled(url));
      return;
    }
    const cached = recall(url);
    if (cached) {
      setState(settled(url, cached));
      return;
    }

    setState({ ...settled(url), loading: true });
    const controller = new AbortController();
    const timer = setTimeout(() => {
      openmrsFetch(url, { signal: controller.signal }).then(
        (response) => {
          if (controller.signal.aborted) return;
          let hits: Array<SavedSearchHit>;
          try {
            hits = toHits(response.data).filter((hit) => isUuid(hit.uuid));
          } catch {
            // An answer that can't be read is a plain error, not an unreachable server, and isn't remembered.
            setState({ ...settled(url), error: true });
            return;
          }
          remember(url, hits);
          setState(settled(url, hits));
        },
        (error: unknown) => {
          if (!controller.signal.aborted) {
            setState({ ...settled(url), error: true, unavailable: isServerUnreachable(error) });
          }
        },
      );
    }, savedSearchDelayMs);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [url, toHits]);

  // Until the effect has caught up with a new url, the old state answers a different search.
  return state.url === url ? state : { ...settled(url), loading: Boolean(url) };
}
