import { test, expect } from '@playwright/test';
import { CohortBuilderPage } from '../pages';

test('search by enrollments', async ({ page }) => {
  const cohortBuilderPage = new CohortBuilderPage(page);

  await test.step('When I visit the cohort builder', async () => {
    await cohortBuilderPage.gotoCohortBuilder();
  });

  await test.step('And I select enrollments tab', async () => {
    await cohortBuilderPage.enrollmentsTab().click();
  });

  await test.step('And I select the enrollments values', async () => {
    await page.getByText(/select programs/i).click();
    await page.getByRole('option', { name: 'HIV Care and Treatment' }).locator('label').click();
    await page.getByRole('option', { name: 'HIV Preventative Services (PEP/PrEP)' }).locator('label').click();
    await page.mouse.click(0, 0);
    await page
      .getByLabel(/enrollments/i, { exact: true })
      .getByText(/select locations/i)
      .click();
    await page.getByText(/community outreach/i).click();
    await page.mouse.click(0, 0);
    await page.getByRole('textbox', { name: 'Enrolled between' }).click();
    await page.getByRole('textbox', { name: 'Enrolled between' }).fill('01-07-2023');
    await page.getByRole('textbox', { name: 'Enrolled between' }).press('Tab');
    await page.locator('#enrolledOnOrBefore').click();
    await page.locator('#enrolledOnOrBefore').fill('30-07-2023');
    await page.locator('#enrolledOnOrBefore').press('Tab');
  });

  await test.step('Then I click the search button', async () => {
    await cohortBuilderPage.searchButton().click();
  });

  await test.step('Then should get a success notification', async () => {
    await expect(cohortBuilderPage.successNotification()).toBeVisible();
  });
});
