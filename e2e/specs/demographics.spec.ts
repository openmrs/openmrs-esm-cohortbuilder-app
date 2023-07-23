import { test, expect } from "@playwright/test";
import { CohortBuilderPage } from "../pages";

test("search by demographics", async ({ page }) => {
  const cohortBuilderPage = new CohortBuilderPage(page);

  await test.step("When I visit the cohort builder", async () => {
    await cohortBuilderPage.gotoCohortBuilder();
  });

  await test.step("And I select demographics tab", async () => {
    await cohortBuilderPage.demographicsTab().click();
  });

  await test.step("And I select the demographic values", async () => {
    const startDate = cohortBuilderPage
      .demographicsTabPanel()
      .locator("#startDate");
    const endDate = cohortBuilderPage
      .demographicsTabPanel()
      .locator("#endDate");

    await startDate.click();
    await startDate.fill("07/03/2023");
    await endDate.click();
    await endDate.fill("07/12/2023");
    await page.getByTestId("minAge").fill("10");
    await page.getByTestId("maxAge").fill("50");
    await page.getByTestId("Male").click();
    await page.getByRole("tab", { name: "Alive" }).click();
  });

  await test.step("Then I click the search button", async () => {
    await cohortBuilderPage.searchButton().click();
  });

  await test.step("Then should get a success", async () => {
    await expect(cohortBuilderPage.successNotification()).toBeVisible();
  });
});
