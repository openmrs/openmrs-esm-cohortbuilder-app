import { getAsyncLifecycle } from "@openmrs/esm-framework";

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

export const cohortBuilder = getAsyncLifecycle(
  () => import("./cohort-builder"),
  options
);

export function startupApp() {}
