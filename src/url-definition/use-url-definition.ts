import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useConfig } from '@openmrs/esm-framework';
import type { SearchParams } from '../types';
import { type ConfigObject } from '../config-schema';
import { composeQueries } from '../components/composition/composition.utils';
import {
  buildSearch,
  describeSearches,
  LinkError,
  type CohortDefinition,
  readUrlRequest,
  type Search,
  URL_PARAMS,
  type UrlRequest,
} from './url-definition';
import { fetchDisplayNames } from './url-definition.resources';

interface UrlDefinitionHandlers {
  runSearch: (searchParams: SearchParams, description: string) => Promise<boolean>;
  showCohort: (cohortUuid: string) => Promise<boolean>;
  showQuery: (queryUuid: string) => Promise<boolean>;
  onHistoryChange: () => void;
}

/**
 * Runs the definition, saved cohort or saved query named in the page URL, and removes it from the URL
 * first, so each link runs once. Also runs links opened while the page is shown, such as from the
 * omnibar. Returns why the last link could not be opened, if it could not.
 */
export function useUrlDefinition({
  runSearch,
  showCohort,
  showQuery,
  onHistoryChange,
}: UrlDefinitionHandlers): string | null {
  const { t } = useTranslation();
  const { drugOrderSearchDefinitionKey } = useConfig<ConfigObject>();
  const [error, setError] = useState<Error | null>(null);
  const isRunning = useRef(false);
  // A link opened while another is still running waits here; only the latest one is kept.
  const queuedParams = useRef<URLSearchParams | null>(null);

  useEffect(() => {
    const handlers = { runSearch, showCohort, showQuery, onHistoryChange };

    const runLink = async (params: URLSearchParams) => {
      isRunning.current = true;
      setError(null);
      try {
        await runRequest(readLinkRequest(params), handlers, drugOrderSearchDefinitionKey);
      } catch (linkError) {
        setError(linkError);
      }
      isRunning.current = false;

      const nextParams = queuedParams.current;
      queuedParams.current = null;
      if (nextParams) {
        runLink(nextParams);
      }
    };

    const openLinkInUrl = () => {
      const params = new URLSearchParams(window.location.search);
      if (!URL_PARAMS.some((name) => params.has(name))) {
        return;
      }
      // Removing the params before running is what makes a link run once: a reload, StrictMode's
      // second effect or a later popstate finds nothing to run.
      removeUrlParams();
      if (isRunning.current) {
        queuedParams.current = params;
      } else {
        runLink(params);
      }
    };

    openLinkInUrl();
    // The page stays mounted when another link to it is opened; single-spa's navigateToUrl fires popstate.
    window.addEventListener('popstate', openLinkInUrl);
    return () => window.removeEventListener('popstate', openLinkInUrl);
  }, [runSearch, showCohort, showQuery, onHistoryChange, drugOrderSearchDefinitionKey]);

  if (!error) {
    return null;
  }
  if (!(error instanceof LinkError)) {
    return error.message;
  }
  // The message is rendered as React text, which escapes it already; i18next escaping would show "&#x2F;".
  return t(error.key, error.defaultMessage, { ...error.options, interpolation: { escapeValue: false } });
}

/**
 * The link's request, or one plain error for any link that isn't valid. The reason stays out of the
 * page: it can quote the link, and anyone can write a link.
 */
function readLinkRequest(params: URLSearchParams): UrlRequest {
  try {
    return readUrlRequest(params);
  } catch (error) {
    if (!(error instanceof LinkError)) {
      // A bug, not a bad link. Its name only: the message could quote the link.
      console.error(`Cohort builder: reading a link failed with ${error?.name ?? 'an error'}`);
    }
    throw new LinkError('invalidCohortLink', "This link isn't a valid cohort query");
  }
}

function removeUrlParams() {
  const url = new URL(window.location.href);
  URL_PARAMS.forEach((name) => url.searchParams.delete(name));
  window.history.replaceState(window.history.state, '', url);
}

async function runRequest(request: UrlRequest, handlers: UrlDefinitionHandlers, drugOrderSearchDefinitionKey: string) {
  switch (request.type) {
    case 'cohort':
      if (!(await handlers.showCohort(request.uuid))) {
        throw new LinkError('linkCohortFailed', 'The saved cohort could not be loaded');
      }
      return;
    case 'query':
      if (!(await handlers.showQuery(request.uuid))) {
        throw new LinkError('linkQueryFailed', 'The saved query could not be run');
      }
      return;
    case 'definition':
      return runDefinition(request.definition, handlers, drugOrderSearchDefinitionKey);
  }
}

/**
 * Runs each criterion as its own search, then a composition ANDing them. If anything fails, the
 * history entries this link added are removed again, so a link never leaves half of its searches behind.
 * Every entry is described in the builder's own words for its criteria; the link's label is never
 * shown, so a link can't call one population another.
 */
async function runDefinition(
  definition: CohortDefinition,
  { runSearch, onHistoryChange }: UrlDefinitionHandlers,
  drugOrderSearchDefinitionKey: string,
) {
  const { criteria } = definition;
  const names = await fetchDisplayNames(definition);
  // Ids of the entries this link added. Each id is stored on its entry, so it still names that
  // entry after history is cleared or an earlier entry is deleted.
  const addedEntryIds: string[] = [];
  // True after runSearch has appended a row and before that row has an id. The catch drops it.
  let pendingEntry = false;

  const runAndRecord = async ({ searchParams, description }: Search) => {
    if (!(await runSearch(searchParams, description))) {
      throw new LinkError(
        'linkSearchFailed',
        'The search "{{description}}" failed, so none of this link\'s searches were kept',
        { description },
      );
    }
    // runSearch appends to the history just before it resolves, so the newest entry is this one.
    pendingEntry = true;
    addedEntryIds.push(markNewestHistoryEntry());
    pendingEntry = false;
  };

  try {
    const searches = criteria.map((criterion) => buildSearch(criterion, names, drugOrderSearchDefinitionKey));
    for (const search of searches) {
      await runAndRecord(search);
    }
    if (searches.length >= 2) {
      await runAndRecord({
        searchParams: composeQueries(searches.map(({ searchParams }) => searchParams.query)),
        description: describeSearches(searches),
      });
    }
  } catch (error) {
    if (pendingEntry) {
      removeNewestHistoryEntry();
    }
    removeHistoryEntries(addedEntryIds);
    onHistoryChange();
    throw error;
  }
}

/** Works on plain http, where crypto.randomUUID is missing outside a secure context. */
function newEntryId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `h${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;
  }
}

/** The id stays on the entry, so a later delete of some other entry cannot make it refer to a different search. */
function markNewestHistoryEntry(): string {
  const history = readHistory();
  const added = history.at(-1);
  if (!added) {
    throw new LinkError(
      'linkSearchNotRecorded',
      "The search could not be recorded, so none of this link's searches were kept",
    );
  }
  added.entryId = newEntryId();
  window.sessionStorage.setItem('openmrsHistory', JSON.stringify(history));
  return added.entryId;
}

function removeNewestHistoryEntry() {
  const history = readHistory();
  history.pop();
  window.sessionStorage.setItem('openmrsHistory', JSON.stringify(history));
}

function removeHistoryEntries(entryIds: string[]) {
  const remove = new Set(entryIds);
  const remaining = readHistory().filter((entry) => !remove.has(entry.entryId));
  window.sessionStorage.setItem('openmrsHistory', JSON.stringify(remaining));
}

function readHistory(): Array<{ entryId?: string }> {
  return JSON.parse(window.sessionStorage.getItem('openmrsHistory')) ?? [];
}
