import { test, expect } from '@playwright/test';
import { CohortBuilderPage } from '../pages';

test('create a composition based on search history', async ({ page }) => {
  const cohortBuilderPage = new CohortBuilderPage(page);

  await test.step('When I visit the cohort builder', async () => {
    await cohortBuilderPage.gotoCohortBuilder();
  });

  await test.step('And I select location tab', async () => {
    await cohortBuilderPage.locationTab().click();
  });

  await test.step('And I create two searches based on location', async () => {
    await page
      .getByLabel(/location/i, { exact: true })
      .getByText(/select locations/i)
      .click();
    await page.getByText(/community outreach/i).click();
    await page.getByText(/inpatient ward/i).click();
    await page.mouse.click(0, 0);
    await page.getByRole('combobox', { name: /any encounter/i }).click();
    await page.getByRole('option', { name: /any encounter/i }).click();
    await cohortBuilderPage.searchButton().click();

    await page.getByRole('combobox', { name: /any encounter/i }).click();
    await page.getByText(/most recent encounter/i).click();
    await cohortBuilderPage.searchButton().click();
  });

  await test.step('And I select the Composition tab', async () => {
    await cohortBuilderPage.compositionTab().click();
  });

  await test.step('And I perform a search using a selected location', async () => {
    await page.getByTestId('composition-query').fill('1 and 2');
  });

  await test.step('Then I click the search button', async () => {
    await cohortBuilderPage.searchButton().click();
  });

  await test.step('Then should see a success notification', async () => {
    await expect(cohortBuilderPage.successNotification()).toBeVisible();
  });
});
