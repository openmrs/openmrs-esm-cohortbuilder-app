import React from "react";

import { render, cleanup, fireEvent } from "@testing-library/react";

import { Response } from "../../../types";
import SavedCohortsOptions from "./saved-cohorts-options.component";

const cohort: Response = {
  description: "Female Patients that are alive",
  id: "1",
  uuid: "1",
  display: "",
};

describe("Test the saved cohorts options", () => {
  afterEach(cleanup);
  it("should be able to view the saved cohort", async () => {
    const viewCohort = jest.fn();
    const { getByTestId } = render(
      <SavedCohortsOptions
        cohort={cohort}
        viewCohort={viewCohort}
        deleteCohort={jest.fn()}
      />
    );

    fireEvent.click(getByTestId("options"));
    fireEvent.click(getByTestId("view"));
    expect(viewCohort).toBeCalledWith(cohort.uuid);
  });

  it("should be able delete a cohort", async () => {
    const deleteCohort = jest.fn();
    const { getByText, getByTestId } = render(
      <SavedCohortsOptions
        cohort={cohort}
        viewCohort={jest.fn()}
        deleteCohort={deleteCohort}
      />
    );

    fireEvent.click(getByTestId("options"));
    fireEvent.click(getByTestId("delete"));
    fireEvent.click(getByText("Delete"));
    expect(deleteCohort).toBeCalledWith(cohort.uuid);
  });
});
