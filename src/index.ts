import { defineConfigSchema, getAsyncLifecycle, getSyncLifecycle } from '@openmrs/esm-framework';
import { configSchema } from './config-schema';
import clearSearchHistoryModalComponent from './components/search-history/search-history-options/clear-search-history.modal';
import clearItemFromSearchHistoryModalComponent from './components/search-history/search-history-options/clear-item-from-search-history.modal';
import cohortBuilderAdminPageCardLinkComponent from './cohort-builder-admin-link.component';
import cohortBuilderComponent from './cohort-builder.component';
import deleteCohortModalComponent from './components/saved-cohorts/saved-cohorts-options/delete-cohort.modal';
import deleteQueryModalComponent from './components/saved-queries/saved-queries-options/delete-query.modal';
import saveCohortModalComponent from './components/search-history/search-history-options/save-cohort.modal';
import saveQueryModalComponent from './components/search-history/search-history-options/save-query.modal';
import { withProviderBoundary } from './omnibar/omnibar-contract';

const moduleName = '@openmrs/esm-cohort-builder-app';

const options = {
  featureName: 'cohort-builder',
  moduleName,
};

export const importTranslation = require.context('../translations', false, /.json$/, 'lazy');

export function startupApp() {
  defineConfigSchema(moduleName, configSchema);
}

export const cohortBuilder = getSyncLifecycle(cohortBuilderComponent, options);

export const cohortBuilderAdminPageCardLink = getSyncLifecycle(cohortBuilderAdminPageCardLinkComponent, options);

export const clearItemFromSearchHistoryModal = getSyncLifecycle(clearItemFromSearchHistoryModalComponent, options);

export const clearSearchHistoryModal = getSyncLifecycle(clearSearchHistoryModalComponent, options);

export const deleteCohortModal = getSyncLifecycle(deleteCohortModalComponent, options);

export const deleteQueryModal = getSyncLifecycle(deleteQueryModalComponent, options);

export const saveCohortModal = getSyncLifecycle(saveCohortModalComponent, options);

export const saveQueryModal = getSyncLifecycle(saveQueryModalComponent, options);

// Omnibar providers. Async, so each provider's code is a chunk of its own, loaded only when an omnibar mounts it.
const bounded =
  (name: string) =>
  ({ default: Provider }) => ({ default: withProviderBoundary(Provider, name) });

export const cohortCountOmnibarProvider = getAsyncLifecycle(
  () => import('./omnibar/providers/cohort-count.provider').then(bounded('omnibar-cohort-count-provider')),
  options,
);

export const cohortBuilderOmnibarProvider = getAsyncLifecycle(
  () => import('./omnibar/providers/cohort-builder.provider').then(bounded('omnibar-cohort-builder-provider')),
  options,
);

export const savedCohortsOmnibarProvider = getAsyncLifecycle(
  () => import('./omnibar/providers/saved-cohorts.provider').then(bounded('omnibar-saved-cohorts-provider')),
  options,
);

export const savedQueriesOmnibarProvider = getAsyncLifecycle(
  () => import('./omnibar/providers/saved-queries.provider').then(bounded('omnibar-saved-queries-provider')),
  options,
);
