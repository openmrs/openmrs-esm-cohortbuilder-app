import { test, expect } from "@playwright/test";
import { CohortBuilderPage } from "../pages";

test("search by person attributes", async ({ page }) => {
  const cohortBuilderPage = new CohortBuilderPage(page);

  await test.step("When I visit the cohort builder", async () => {
    await cohortBuilderPage.gotoCohortBuilder();
  });

  await test.step("And I select person attributes tab", async () => {
    await cohortBuilderPage.personAttributesTab().click();
  });

  await test.step("And I select email attribute", async () => {
    await page
      .getByRole("button", { name: "Select a person attribute Open menu" })
      .click();
    await page.getByText("email").click();
  });

  await test.step("And I enter the email", async () => {
    await page
      .getByTestId("selectedAttributeValues")
      .fill("testemail@gmail.com");
  });

  await test.step("And I click the search button", async () => {
    await cohortBuilderPage.searchButton().click();
  });

  await test.step("Then should get a success notification", async () => {
    await expect(cohortBuilderPage.successNotification()).toBeVisible();
  });
});
