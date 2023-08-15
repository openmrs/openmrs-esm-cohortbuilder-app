import { test, expect } from "@playwright/test";
import { CohortBuilderPage } from "../pages";

test("search by location", async ({ page }) => {
  const cohortBuilderPage = new CohortBuilderPage(page);

  await test.step("When I visit the cohort builder", async () => {
    await cohortBuilderPage.gotoCohortBuilder();
  });

  await page.getByRole("tab", { name: "Location" }).click();
  await page
    .getByRole("tabpanel", { name: "Location" })
    .locator("div")
    .filter({ hasText: "Select locationsOpen menu" })
    .nth(2)
    .click();
  await page.getByText("ART Clinic").click();
  await page.getByText("Community Outreach").click();
  await page
    .getByRole("button", {
      name: "Total items selected: 2,To clear selection, press Delete or Backspace, 2 Clear all selected items Select locations Close menu",
    })
    .click();
  await page.getByRole("button", { name: "Any Encounter Open menu" }).click();
  await page
    .getByRole("option", { name: "Any Encounter" })
    .getByText("Any Encounter")
    .click();

  await test.step("Then I click the search button", async () => {
    await cohortBuilderPage.searchButton().click();
  });

  await test.step("Then should get a success notification", async () => {
    await expect(cohortBuilderPage.successNotification()).toBeVisible();
  });
});
