/**
 * The omnibar provider contract.
 *
 * A provider is an ordinary O3 extension attached to `omnibar-providers-slot`. It renders nothing.
 * The omnibar mounts it while the panel is open, passes it the current query and context as props,
 * and the provider calls `report` with what it found. Because providers are extensions, they get
 * lazy loading, privilege gating, feature flags, display expressions, and per-module config and
 * translations from the framework, and can use the same SWR hooks as the rest of their app.
 *
 * Providers describe results; the omnibar acts on them. A result can only point at a destination
 * (a URL or a workspace). There is deliberately no `onSelect` callback, so nothing in the bar
 * can write to the record directly: anything that changes data opens a form or workspace first.
 */

/**
 * The contract version this folder describes. A provider declares the major version it was built
 * against as `meta.contract`, and the host passes the one it speaks as `contractVersion`. Optional
 * fields added later keep the number, so providers must work without them.
 */
export const OMNIBAR_CONTRACT_VERSION = 1;

/** Where the omnibar is being used. Set by the shell, never by providers. */
export type OmnibarScope = 'global' | 'patient';

export interface OmnibarContext {
  scope: OmnibarScope;
  /** Set only when scope is 'patient'. */
  patientUuid?: string;
  locale: string;
  /**
   * The workspace group that is open, such as the chart's side panel, and for which patient. Null
   * when none is. Opening or closing it re-renders providers with the new value, but never clears
   * the results or remounts providers. Hosts from before contract 1 was published don't pass it.
   */
  workspaceGroup?: OmnibarWorkspaceGroup | null;
  /**
   * The slash command in force, such as `{ id: 'lab' }` for `/lab cd4`. Set only for providers that
   * declare that id, and for views that do. New in v1 and optional; a provider must work without it.
   */
  command?: { id: string };
}

/**
 * A slash command a provider answers, new in v1 and optional. `id` is stable, lower-case ASCII
 * (letters, digits and hyphens, starting with a letter), never shown and never translated: URLs,
 * history and config use it. `aliases` are the English names people type after the slash, without the
 * slash, each one word. Translated aliases, the label and the description come from the provider
 * module's translations: `omnibarCommand.<id>.aliases` (comma-separated), `.label` and `.description`.
 * Several providers may declare the same id; their aliases are merged and all of them run.
 */
export interface OmnibarCommand {
  id: string;
  aliases: Array<string>;
}

export interface OmnibarWorkspaceGroup {
  groupName: string;
  /** Set only when the group was opened with a string `patientUuid` prop. */
  patientUuid?: string;
}

/**
 * Lanes keep fast and slow results from fighting over position.
 * - navigate: apps, pages, actions that open a page or form
 * - record: patients, observations, orders, conditions
 * - answer: free-text answers (e.g. ChartSearch). Rendered in its own region, below the list,
 *   so a streaming answer never moves a result the user is arrowing toward.
 */
export type OmnibarLane = 'navigate' | 'record' | 'answer';

/** Declared in the provider's routes.json entry as `meta`. */
export interface OmnibarProviderMeta {
  lane: OmnibarLane;
  /** Scopes in which the provider is mounted. */
  scopes: Array<OmnibarScope>;
  /** Lower comes first. Defaults to 100. */
  order?: number;
  /** Optional different order inside a chart, where chart lookups usually outrank patient search. */
  patientScopeOrder?: number;
  /**
   * The results are about the open chart, or are pages, so inside a chart they may take the default
   * highlight. Without it, a provider's results inside a chart are selected only by an arrow key or
   * the pointer, so Enter alone can't open another patient's chart from a provider that forgot to say
   * it lists other patients. The host holds the claim to account: a result whose target names another
   * patient is never the default inside a chart, with or without it. A link names a patient by an id
   * in the segment after `patient` (decoded as the router decodes it) or after `patient/` in its query
   * or hash; a workspace by a `patientUuid` in any of its props. See the contract doc for the details.
   */
  defaultInChart?: boolean;
  /**
   * The contract major version the provider was built against: a whole number. Missing means 1. A
   * host mounts the provider only when it speaks that version.
   */
  contract?: number;
  /**
   * Not mounted, and so never asked, while the query looks like a patient identifier, so a scanned
   * MRN never reaches a semantic index or a model. Its group disappears for that query. Patient
   * search must not set it.
   */
  skipIdentifierQueries?: boolean;
  /**
   * Providers that may find the same record share a key, such as `chart-values`. When mounted
   * providers with the same key report results with the same `dedupeId`, only one copy is shown: the
   * first (lane, then order) that may take the default highlight, else the first that names no other
   * patient than the chart's, else the first of all. So inside a chart a provider without
   * `defaultInChart` never pushes out a `defaultInChart` provider's copy. The kept copy's target is
   * the one that runs, so only one provider with a key should set `defaultInChart`. A group left with
   * nothing isn't shown at all.
   */
  dedupeKey?: string;
  /**
   * The slash command this provider answers, new in v1 and optional. With a command chosen in the bar,
   * only providers declaring its id are mounted, under every other rule here as well, and they get it
   * as `context.command`. Every provider still runs for plain text; one that declares no command isn't
   * mounted while a command is chosen.
   */
  command?: OmnibarCommand;
}

/** Facts about the query, worked out once by the host for every provider. */
export interface OmnibarQueryHints {
  /** See `looksLikeIdentifier`. */
  looksLikeIdentifier: boolean;
  /**
   * New in v1. See `looksLikeQuestion`, called with the host's own word count. Hosts from before it
   * was added don't pass it; call `looksLikeQuestion(query)` then.
   */
  looksLikeQuestion?: boolean;
}

export type OmnibarTarget =
  | {
      type: 'navigate';
      /** Accepts `${openmrsSpaBase}` and the other placeholders `navigate()` understands. */
      to: string;
    }
  | {
      type: 'workspace';
      workspaceName: string;
      workspaceProps?: object;
      windowProps?: object;
      groupProps?: object;
      /**
       * When set, the launch is refused unless this workspace's window group is already open
       * for this patient. Null group props stay null so an existing group is left alone.
       * With or without it, a launch is refused when `workspaceProps`, `windowProps` or `groupProps`
       * has a string `patientUuid` naming another patient than this one or, inside a chart, the
       * chart's. The selection event has already fired and the bar has already closed, so the
       * omnibar shows a warning snackbar when it refuses.
       */
      requiresOpenGroup?: {
        workspaceName: string;
        patientUuid: string;
      };
    };

/**
 * A result without a text `id` and `title`, or with a target the host doesn't know, is dropped.
 * Direction controls are taken out of its text.
 */
export interface OmnibarResult {
  /** Unique within the provider. */
  id: string;
  title: string;
  subtitle?: string;
  /**
   * Set when the result is a patient. The row is then laid out like the patient search app's: an
   * avatar, the title as the name with the gender beside it, then age, birthdate and identifiers.
   * The subtitle, if any, follows them.
   */
  patient?: OmnibarPatient;
  target: OmnibarTarget;
  /**
   * The record this result shows, such as `obs:<obs uuid>`. Compared across providers that share a
   * `dedupeKey`.
   */
  dedupeId?: string;
}

export interface OmnibarPatient {
  uuid: string;
  /** The OpenMRS code: M, F, O or U. */
  gender?: string;
  /** As the REST API returns it. */
  birthdate?: string;
  /** Shown in order. The one whose type is the primary identifier type is shown as a tag. */
  identifiers?: Array<{ identifier: string; typeUuid?: string; typeName?: string }>;
}

export interface OmnibarSource {
  label: string;
  target: OmnibarTarget;
}

export interface OmnibarAnswer {
  text: string;
  /** True while more text is still arriving. */
  streaming: boolean;
  /** The records the answer drew on. Answers without sources should not be shown to clinicians. */
  sources: Array<OmnibarSource>;
}

export interface OmnibarReport {
  /** The query these results answer. Reports for any other query are discarded as stale. */
  query: string;
  status: 'idle' | 'loading' | 'ready' | 'error';
  /** Group heading, already translated by the provider. */
  title: string;
  /**
   * The first 200 are read and deduped, then at most 50 are shown. A report whose `results` isn't a
   * list is ignored. The host keeps its own copy of each target.
   */
  results?: Array<OmnibarResult>;
  answer?: OmnibarAnswer;
  /**
   * The state of the source behind the results, drawn as one quiet line under the heading. A
   * provider that can't reach its server reports `status: 'error'` with `detail.state: 'unavailable'`
   * (see `isServerUnreachable`). Drawn for the record and navigate lanes; the answer lane ignores it
   * in contract 1, as do hosts from before contract 1 was published.
   */
  detail?: OmnibarReportDetail;
}

export interface OmnibarReportDetail {
  /**
   * - projecting: the results so far, with "Still indexing; results may be incomplete"
   * - indexed: drawn like a report with no detail
   * - failed: the group collapses to its heading and "Couldn't load results"; results are dropped
   * - unavailable: the group collapses to its heading and "Unavailable right now"; results are dropped
   */
  state: 'projecting' | 'indexed' | 'failed' | 'unavailable';
  /**
   * Shown instead of the host's line for `projecting` and `unavailable`, already translated, and cut
   * to 200 characters. A `projecting` group with no results yet still shows it under its heading. A `failed` group always shows the host's "Couldn't load results". Never put a
   * server's message here: it can quote the query or the record.
   */
  note?: string;
}

/** Props every provider extension receives. */
export interface OmnibarProviderProps {
  query: string;
  context: OmnibarContext;
  /**
   * Dropped once the host has moved past this mount: another chart or scope, the bar closing, or the
   * provider leaving.
   */
  report: (report: OmnibarReport) => void;
  /** Hosts from before contract 1 was published don't pass it. */
  hints?: OmnibarQueryHints;
  /** The contract version the host speaks. Hosts from before contract 1 was published don't pass it. */
  contractVersion?: number;
}

/**
 * Query results views, new in v1 and optional. Pressing Enter on a query inside a chart opens the
 * chart's Query results section, which mounts every view in this slot with that query. A view is an
 * ordinary extension, registered from its own app's routes.json with `OmnibarViewMeta` as its meta.
 * Unlike a provider it renders: one section of the page, with its own heading. The design rules apply
 * as they do to providers: a view navigates or opens a workspace, never writes to the record, calls a
 * model only for a query the user just submitted or when the clinician asks in the view, and uses
 * `context.patientUuid` only.
 */
export const OMNIBAR_QUERY_RESULTS_SLOT = 'omnibar-query-results-slot';

/**
 * What a view tells the host about its section.
 * - loading: still looking
 * - empty: nothing for this query; the host hides the section, and when every view says so, the
 *   page says plainly that nothing matched
 * - ready: the section has something to show
 * - error: it failed; the view says so in its own section, never with a server's message
 * - unavailable: its server couldn't be reached (see `isServerUnreachable`); the view says
 *   "Unavailable right now" in its own section
 */
export type OmnibarViewState = 'loading' | 'empty' | 'ready' | 'error' | 'unavailable';

/** Declared in the view's routes.json entry as `meta`. */
export interface OmnibarViewMeta {
  /** Only 'patient' for now: there is no Query results page outside a chart. */
  scopes: Array<OmnibarScope>;
  /** Lower comes first. Defaults to 100. */
  order?: number;
  /** As for providers: the contract major version, a whole number. Missing means 1. */
  contract?: number;
  /** As for providers: not mounted while the query looks like a patient identifier. */
  skipIdentifierQueries?: boolean;
  /**
   * The slash command this view shows results for, new in v1 and optional. A query sent with a
   * command mounts only the views declaring its id; a view without one mounts only for plain queries.
   * `id` is as for a provider's `OmnibarCommand`. `aliases`, also new in v1 and optional, are as for a
   * provider: the English names typed after the slash. A view that declares a command adds it to the
   * bar's command list as a provider does, merged with any provider's declaration of the same id, while
   * the view is assigned to the user, for a patient, on a contract the host speaks. Translated aliases,
   * the label and the description come from the view module's translations,
   * `omnibarCommand.<id>.aliases` (comma-separated), `.label` and `.description`, as for providers. A
   * command only views declare mounts no providers in the bar.
   */
  command?: { id: string; aliases?: Array<string> };
  /**
   * New in v1. The view may call a model for a query the user just submitted, and this is the name the
   * bar's hint uses: "Enter to see all results for '…' and ask ChartSearch". Shown as written, so it
   * is a product name, not a sentence. The bar says it only while the view is assigned to the user,
   * isn't skipped for the query and would mount for it (under a command, only a view declaring it);
   * the query looks like a question by the same test the host passes as `hints.looksLikeQuestion`, or,
   * under the `ask` command, is any text that isn't ID-shaped; and Enter marks the submission: for
   * plain text, and under `ask`, never under another command.
   */
  asksModel?: string;
}

/** Props every Query results view receives. */
export interface OmnibarViewProps {
  query: string;
  /** The chart's patient, from the host. Never read the patient from the URL. */
  context: OmnibarContext;
  /** The contract version the host speaks. */
  contractVersion: number;
  /** Dropped once the host has moved past this mount: another query or chart, or the page closing. */
  reportState: (state: OmnibarViewState) => void;
  hints?: OmnibarQueryHints;
  /**
   * True when the user asked for this query just now: Enter in the bar, its "see all results" line, or
   * an earlier query chosen on the page. False when the page was reloaded, reached with back or
   * forward, or opened from a bookmark or the left nav. A view that calls a model calls it only when
   * this is true, or when the clinician asks in the view.
   */
  submitted?: boolean;
  /**
   * New in v1. Aborted when the host moves past this mount: another query or chart, a rerun, the page
   * closing. Hosts from before it was added don't pass it, so a view still aborts its own work when it
   * unmounts.
   */
  signal?: AbortSignal;
}

/** Fired on window after the user picks a result, for bookkeeping such as recently viewed patients. */
export const OMNIBAR_SELECTED_EVENT = 'openmrs:omnibar-selected';

export interface OmnibarSelectedDetail {
  providerId: string;
  resultId: string;
}
