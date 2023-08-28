import { test, expect } from "@playwright/test";
import { CohortBuilderPage } from "../pages";

test("create a composition based on search history", async ({ page }) => {
  const cohortBuilderPage = new CohortBuilderPage(page);

  await test.step("When I visit the cohort builder", async () => {
    await cohortBuilderPage.gotoCohortBuilder();
  });

  await test.step("And I select location tab", async () => {
    await cohortBuilderPage.locationTab().click();
  });

  await test.step("And I create two searches based on location", async () => {
    await page
      .getByRole("button", { name: "Select locations Open menu" })
      .click();
    await page.getByText("Community Outreach").click();
    await page.getByText("Inpatient Ward").click();
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
    await cohortBuilderPage.searchButton().click();

    await page.getByRole("button", { name: "Any Encounter Open menu" }).click();
    await page.getByText("Most Recent Encounter").click();
    await cohortBuilderPage.searchButton().click();
  });

  await test.step("And I select composition tab", async () => {
    await cohortBuilderPage.compositionTab().click();
  });

  await test.step("And I create to searches based on location", async () => {
    await page.getByTestId("composition-query").fill("1 and 2");
  });

  await test.step("Then I click the search button", async () => {
    await cohortBuilderPage.searchButton().click();
  });

  await test.step("Then should get a success notification", async () => {
    await expect(cohortBuilderPage.successNotification()).toBeVisible();
  });
});
