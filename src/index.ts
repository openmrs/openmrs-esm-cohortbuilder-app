import { getSyncLifecycle } from "@openmrs/esm-framework";

import cohortBuilderComponent from "./cohort-builder";
import cohortBuilderAdminPageCardLinkComponent from "./cohort-builder-admin-link.component";

const moduleName = "@openmrs/esm-cohort-builder";

const options = {
  featureName: "cohort-builder",
  moduleName,
};

export const importTranslation = require.context(
  "../translations",
  false,
  /.json$/,
  "lazy"
);

export function startupApp() {}

export const cohortBuilder = getSyncLifecycle(cohortBuilderComponent, options);

export const cohortBuilderAdminPageCardLink = getSyncLifecycle(
  cohortBuilderAdminPageCardLinkComponent,
  options
);
