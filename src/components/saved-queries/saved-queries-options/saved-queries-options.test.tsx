import React from "react";

import { screen, render, cleanup, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { DefinitionDataRow } from "../../../types";
import SavedQueriesOptions from "./saved-queries-options.component";

const query: DefinitionDataRow = {
  id: "1",
  name: "Female Patients",
  description: "Female Patients that are alive",
};

const testProps = {
  query: query,
  onViewQuery: jest.fn(),
  deleteQuery: jest.fn(),
};

const renderSavedQueriesOptions = (props = testProps) => {
  render(<SavedQueriesOptions {...props} />);
};

describe("Test the saved queries options", () => {
  afterEach(cleanup);
  it("should be able to view the saved query", async () => {
    const user = userEvent.setup();
    const onViewQuery = jest.fn();
    renderSavedQueriesOptions({ ...testProps, onViewQuery });

    await waitFor(() => user.click(screen.getByTestId("options")));
    await waitFor(() => user.click(screen.getByTestId("view")));
    expect(onViewQuery).toBeCalledWith(query.id);
  });

  it("should be able delete a query", async () => {
    const user = userEvent.setup();
    const deleteQuery = jest.fn();
    renderSavedQueriesOptions({ ...testProps, deleteQuery });

    await waitFor(() => user.click(screen.getByTestId("options")));
    await waitFor(() => user.click(screen.getByTestId("delete")));
    await waitFor(() => user.click(screen.getByText("Delete")));
    expect(deleteQuery).toBeCalledWith(query.id);
  });
});
