import { test, expect } from '@playwright/test';
import { CohortBuilderPage } from '../pages';

test('search by location', async ({ page }) => {
  const cohortBuilderPage = new CohortBuilderPage(page);

  await test.step('When I visit the cohort builder', async () => {
    await cohortBuilderPage.gotoCohortBuilder();
  });

  await test.step('And I select location tab', async () => {
    await cohortBuilderPage.locationTab().click();
  });

  await test.step('And I select the location values', async () => {
    await page
      .getByLabel(/location/i, { exact: true })
      .getByText(/select locations/i)
      .click();
    await page.getByText(/community outreach/i).click();
    await page.mouse.click(0, 0);
    await page.getByRole('combobox', { name: /any encounter/i }).click();
    await page.getByRole('option', { name: 'Any Encounter' }).locator('div').click();
  });

  await test.step('Then I click the search button', async () => {
    await cohortBuilderPage.searchButton().click();
  });

  await test.step('Then should get a success notification', async () => {
    await expect(cohortBuilderPage.successNotification()).toBeVisible();
  });
});
