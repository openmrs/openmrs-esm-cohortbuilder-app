import { Page } from "@playwright/test";

export class CohortBuilderPage {
  constructor(readonly page: Page) {}

  readonly demographicsTab = () =>
    this.page.getByRole("tab", { name: "Demographics" });
  readonly demographicsTabPanel = () =>
    this.page.getByRole("tabpanel", { name: "Demographics" });
  readonly locationTab = () => this.page.getByRole("tab", { name: "Location" });
  readonly locationTabPanel = () =>
    this.page.getByRole("tabpanel", { name: "Location" });
  readonly searchButton = () =>
    this.page.getByRole("button", { name: "Search", exact: true });
  readonly enrollmentsTab = () =>
    this.page.getByRole("tab", { name: "Enrollments" });
  readonly encountersTab = () =>
    this.page.getByRole("tab", { name: "Encounters" });
  readonly conceptsTab = () => this.page.getByRole("tab", { name: "Concepts" });
  readonly compositionTab = () =>
    this.page.getByRole("tab", { name: "Composition" });
  readonly personAttributesTab = () =>
    this.page.getByRole("tab", { name: "Person Attributes" });
  readonly successNotification = () => this.page.getByText("Success!");

  async gotoCohortBuilder() {
    await this.page.goto("cohort-builder");
  }
}
