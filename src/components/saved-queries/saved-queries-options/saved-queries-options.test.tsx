import React from "react";

import { render, cleanup, fireEvent } from "@testing-library/react";

import { Response } from "../../../types";
import SavedQueriesOptions from "./saved-queries-options.component";

const query: Response = {
  description: "Female Patients that are alive",
  id: "1",
  uuid: "1",
  display: "",
};

describe("Test the saved queries options", () => {
  afterEach(cleanup);
  it("should be able to view the saved query", async () => {
    const viewQuery = jest.fn();
    const { getByTestId } = render(
      <SavedQueriesOptions
        query={query}
        viewQuery={viewQuery}
        deleteQuery={jest.fn()}
      />
    );

    fireEvent.click(getByTestId("options"));
    fireEvent.click(getByTestId("view"));
    expect(viewQuery).toBeCalledWith(query.uuid);
  });

  it("should be able delete a query", async () => {
    const deleteQuery = jest.fn();
    const { getByText, getByTestId } = render(
      <SavedQueriesOptions
        query={query}
        viewQuery={jest.fn()}
        deleteQuery={deleteQuery}
      />
    );

    fireEvent.click(getByTestId("options"));
    fireEvent.click(getByTestId("delete"));
    fireEvent.click(getByText("Delete"));
    expect(deleteQuery).toBeCalledWith(query.uuid);
  });
});
