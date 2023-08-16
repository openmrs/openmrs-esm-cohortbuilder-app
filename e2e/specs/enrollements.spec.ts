import { test, expect } from "@playwright/test";
import { CohortBuilderPage } from "../pages";

test("search by enrollments", async ({ page }) => {
  const cohortBuilderPage = new CohortBuilderPage(page);

  await test.step("When I visit the cohort builder", async () => {
    await cohortBuilderPage.gotoCohortBuilder();
  });

  await test.step("And I select enrollments tab", async () => {
    await cohortBuilderPage.enrollmentsTab().click();
  });

  await test.step("And I select the enrollments values", async () => {
    const calendar = await page.getByRole("application", {
      name: "calendar-container",
    });

    await page
      .getByRole("button", { name: "Select programs Open menu" })
      .click();
    await page.getByText("HIV Care and Treatment").click();
    await page.getByText("HIV Preventative Services (PEP/PrEP)").click();
    await page
      .getByRole("button", {
        name: "Total items selected: 2,To clear selection, press Delete or Backspace, 2 Clear all selected items Select programs Close menu",
      })
      .click();
    await page
      .getByRole("button", { name: "Select locations Open menu" })
      .click();
    await page
      .getByRole("option", { name: "ART Clinic" })
      .locator("div")
      .first()
      .click();
    await page.getByText("Community Outreach", { exact: true }).click();
    await page
      .getByRole("button", {
        name: "Total items selected: 2,To clear selection, press Delete or Backspace, 2 Clear all selected items Select locations Close menu",
      })
      .click();
    await page.getByLabel("Enrolled between").click();
    calendar.getByText("1", { exact: true }).first().click();
    await page.locator("#enrolledOnOrBefore").click();
    calendar.getByText("5").first().click();
    await page.getByLabel("Completed between").click();
    calendar.getByText("1", { exact: true }).first().click();
    await page.locator("#completedOnOrBefore").click();
    calendar.getByText("8").first().click();
  });

  await test.step("Then I click the search button", async () => {
    await cohortBuilderPage.searchButton().click();
  });

  await test.step("Then should get a success notification", async () => {
    await expect(cohortBuilderPage.successNotification()).toBeVisible();
  });
});
