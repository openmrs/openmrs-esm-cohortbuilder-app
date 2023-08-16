import { test, expect } from "@playwright/test";
import { CohortBuilderPage } from "../pages";

test("search by concepts", async ({ page }) => {
  const cohortBuilderPage = new CohortBuilderPage(page);

  await test.step("When I visit the cohort builder", async () => {
    await cohortBuilderPage.gotoCohortBuilder();
  });

  await test.step("And I select concepts tab", async () => {
    await cohortBuilderPage.conceptsTab().click();
  });

  await test.step("And I add my search criteria", async () => {
    await page.getByPlaceholder("Search Concepts").click();
    await page.getByPlaceholder("Search Concepts").fill("headac");
    await page.getByRole("button", { name: "Headache" }).click();
    await page
      .getByRole("button", {
        name: "Patients who have these observations Open menu",
      })
      .click();
    await page
      .getByRole("option", { name: "Patients who have these observations" })
      .getByText("Patients who have these observations")
      .click();

    await page.getByTestId("last-months").click();
    await page.getByTestId("last-months").fill("10");
    await page
      .locator("div")
      .filter({ hasText: /^Within the last months$/ })
      .nth(1)
      .click();
    await page.getByTestId("last-days").click();
    await page.getByTestId("last-days").fill("5");

    await page.getByLabel("Date range start date").click();
    await page
      .getByRole("application", { name: "calendar-container" })
      .getByText("1", { exact: true })
      .first()
      .click();
    await page.getByLabel("End date").click();
    await page
      .getByRole("application", { name: "calendar-container" })
      .getByText("8")
      .first()
      .click();
  });

  await test.step("Then I click the search button", async () => {
    await cohortBuilderPage.searchButton().click();
  });

  await test.step("Then should get a success notification", async () => {
    await expect(cohortBuilderPage.successNotification()).toBeVisible();
  });
});
