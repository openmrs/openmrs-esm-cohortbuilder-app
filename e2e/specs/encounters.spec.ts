import { test, expect } from '@playwright/test';
import { CohortBuilderPage } from '../pages';

test('search by encounters', async ({ page }) => {
  const cohortBuilderPage = new CohortBuilderPage(page);

  await test.step('When I visit the cohort builder', async () => {
    await cohortBuilderPage.gotoCohortBuilder();
  });

  await test.step('And I select encounters tab', async () => {
    await cohortBuilderPage.encountersTab().click();
  });

  await test.step('And I select the encounter values', async () => {
    await page.getByText(/select encounter types/i).click();
    await page.getByText(/adult visit/i).click();
    await page.mouse.click(0, 0);
    await page.getByText(/select forms/i).click();
    await page.getByText(/covid 19/i).click();
    await page.mouse.click(0, 0);
    await page
      .getByLabel(/encounters/i, { exact: true })
      .getByText(/select locations/i)
      .click();
    await page.getByText(/inpatient ward/i).click();
    await page.mouse.click(0, 0);
    await page.getByTestId('atLeastCount').fill('10');
    await page.getByTestId('atMostCount').fill('20');
    await page.getByLabel(/from/i).click();
    await page.getByLabel(/from/i).fill('08/01/2023');
  });

  await test.step('Then I click the search button', async () => {
    await cohortBuilderPage.searchButton().click();
  });

  await test.step('Then should get a success notification', async () => {
    await expect(cohortBuilderPage.successNotification()).toBeVisible();
  });
});
