import { Page } from "@playwright/test";

export class CohortBuilderPage {
  constructor(readonly page: Page) {}

  readonly demographicsTab = () =>
    this.page.getByRole("tab", { name: "Demographics" });
  readonly demographicsTabPanel = () =>
    this.page.getByRole("tabpanel", { name: "Demographics" });
  readonly searchButton = () =>
    this.page.getByRole("button", { name: "Search", exact: true });
  readonly successNotification = () => this.page.getByText("Success!");

  async gotoCohortBuilder() {
    await this.page.goto("cohort-builder");
  }
}
