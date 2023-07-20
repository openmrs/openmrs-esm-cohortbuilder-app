import { test } from "@playwright/test";
import { CohortBuilderPage } from "../pages";

test("Should go to form builder", async ({ page }) => {
  const cohortBuilderPage = new CohortBuilderPage(page);
  await cohortBuilderPage.gotoCohortBuilder();
});
