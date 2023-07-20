import { Page } from "@playwright/test";

export class CohortBuilderPage {
  constructor(readonly page: Page) {}

  async gotoCohortBuilder() {
    await this.page.goto("cohort-builder");
  }
}
