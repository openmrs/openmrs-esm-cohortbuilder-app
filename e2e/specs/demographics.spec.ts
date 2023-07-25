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
    const calendar = page.getByRole("application", {
      name: "calendar-container",
    });

    await startDate.click();
    await calendar.getByText("9", { exact: true }).click();
    await endDate.click();
    await calendar.getByText("14", { exact: true }).click();
    await page.getByTestId("minAge").fill("10");
    await page.getByTestId("maxAge").fill("50");
    await page.getByTestId("Male").click();
    await page.getByRole("tab", { name: "Alive" }).click();
  });

  await test.step("Then I click the search button", async () => {
    await cohortBuilderPage.searchButton().click();
  });

  await test.step("Then should get a success notification", async () => {
    await expect(cohortBuilderPage.successNotification()).toBeVisible();
  });
});
