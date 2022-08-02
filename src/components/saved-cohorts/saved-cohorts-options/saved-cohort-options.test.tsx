import React from "react";

import { render, cleanup, fireEvent } from "@testing-library/react";

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
    const onViewCohort = jest.fn();
    const { getByTestId } = render(
      <SavedCohortsOptions
        cohort={cohort}
        onViewCohort={onViewCohort}
        onDeleteCohort={jest.fn()}
      />
    );

    fireEvent.click(getByTestId("options"));
    fireEvent.click(getByTestId("view"));
    expect(onViewCohort).toBeCalledWith(cohort.id);
  });

  it("should be able delete a cohort", async () => {
    const onDeleteCohort = jest.fn();
    const { getByText, getByTestId } = render(
      <SavedCohortsOptions
        cohort={cohort}
        onViewCohort={jest.fn()}
        onDeleteCohort={onDeleteCohort}
      />
    );

    fireEvent.click(getByTestId("options"));
    fireEvent.click(getByTestId("delete"));
    fireEvent.click(getByText("Delete"));
    expect(onDeleteCohort).toBeCalledWith(cohort.id);
  });
});
