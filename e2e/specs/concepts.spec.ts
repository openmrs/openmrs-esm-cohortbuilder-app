import { test, expect } from '@playwright/test';
import { CohortBuilderPage } from '../pages';

test('search by concepts', async ({ page }) => {
  const cohortBuilderPage = new CohortBuilderPage(page);

  await test.step('When I visit the cohort builder', async () => {
    await cohortBuilderPage.gotoCohortBuilder();
  });

  await test.step('And I select concepts tab', async () => {
    await cohortBuilderPage.conceptsTab().click();
  });

  await test.step('And I add my search criteria', async () => {
    await page.getByRole('searchbox', { name: /search concepts/i }).click();
    await page.getByRole('searchbox', { name: /search concepts/i }).fill('headac');
    await page.getByRole('menuitem', { name: 'Headache' }).click();
    await page.getByRole('combobox', { name: /patients who have these observations/i }).click();
    await page.getByRole('option', { name: 'Patients who have these observations' }).click();
    await page.getByTestId('last-months').click();
    await page.getByTestId('last-months').fill('10');
    await page
      .locator('div')
      .filter({ hasText: /^Within the last months$/ })
      .nth(1)
      .click();
    await page.getByTestId('last-days').click();
    await page.getByTestId('last-days').fill('5');
  });

  await test.step('Then I click the search button', async () => {
    await cohortBuilderPage.searchButton().click();
  });

  await test.step('Then should get a success notification', async () => {
    await expect(cohortBuilderPage.successNotification()).toBeVisible();
  });
});
