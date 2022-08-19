import React from "react";

import { screen, render, cleanup, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { DefinitionDataRow } from "../../../types";
import SavedCohortsOptions from "./saved-cohorts-options.component";

const cohort: DefinitionDataRow = {
  id: "1",
  name: "Female Patients",
  description: "Female Patients that are alive",
};

describe("Test the saved cohorts options", () => {
  afterEach(cleanup);
  it("should be able to view the saved cohort", async () => {
    const user = userEvent.setup();
    const onViewCohort = jest.fn();
    render(
      <SavedCohortsOptions
        cohort={cohort}
        onViewCohort={onViewCohort}
        onDeleteCohort={jest.fn()}
      />
    );

    await waitFor(() => user.click(screen.getByTestId("options")));
    await waitFor(() => user.click(screen.getByTestId("view")));
    expect(onViewCohort).toBeCalledWith(cohort.id);
  });

  it("should be able delete a cohort", async () => {
    const user = userEvent.setup();
    const onDeleteCohort = jest.fn();
    render(
      <SavedCohortsOptions
        cohort={cohort}
        onViewCohort={jest.fn()}
        onDeleteCohort={onDeleteCohort}
      />
    );

    await waitFor(() => user.click(screen.getByTestId("options")));
    await waitFor(() => user.click(screen.getByTestId("delete")));
    await waitFor(() => user.click(screen.getByText("Delete")));
    expect(onDeleteCohort).toBeCalledWith(cohort.id);
  });
});
