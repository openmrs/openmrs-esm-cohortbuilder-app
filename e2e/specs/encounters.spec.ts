import { test, expect } from "@playwright/test";
import { CohortBuilderPage } from "../pages";

test("search by encounters", async ({ page }) => {
  const cohortBuilderPage = new CohortBuilderPage(page);

  await test.step("When I visit the cohort builder", async () => {
    await cohortBuilderPage.gotoCohortBuilder();
  });

  await test.step("And I select encounters tab", async () => {
    await cohortBuilderPage.encountersTab().click();
  });

  await test.step("And I select the encounter values", async () => {
    await page
      .getByRole("button", { name: "Select encounter types Open menu" })
      .click();
    await page.getByText("Adult Visit").click();
    await page
      .getByRole("button", {
        name: "Total items selected: 1,To clear selection, press Delete or Backspace, 1 Clear all selected items Select encounter types Close menu",
      })
      .click();
    await page.getByRole("button", { name: "Select forms Open menu" }).click();
    await page.getByText("Covid 19").click();
    await page
      .getByRole("button", {
        name: "Total items selected: 1,To clear selection, press Delete or Backspace, 1 Clear all selected items Select forms Close menu",
      })
      .click();
    await page
      .getByRole("button", { name: "Select locations Open menu" })
      .click();
    await page.getByText("Inpatient Ward").click();
    await page
      .getByRole("button", {
        name: "Total items selected: 1,To clear selection, press Delete or Backspace, 1 Clear all selected items Select locations Close menu",
      })
      .click();
    await page.getByTestId("atLeastCount").fill("10");
    await page.getByTestId("atMostCount").fill("20");
    await page.getByLabel("From").click();
    await page.getByLabel("From").fill("08/01/2023");
    await page.getByRole("textbox", { name: "to" }).click();
    await page.getByRole("textbox", { name: "to" }).fill("08/21/2023");
  });

  await test.step("Then I click the search button", async () => {
    await cohortBuilderPage.searchButton().click();
  });

  await test.step("Then should get a success notification", async () => {
    await expect(cohortBuilderPage.successNotification()).toBeVisible();
  });
});
