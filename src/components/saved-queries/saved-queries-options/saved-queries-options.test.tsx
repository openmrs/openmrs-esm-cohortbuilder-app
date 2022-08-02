import React from "react";

import { render, cleanup, fireEvent } from "@testing-library/react";

import { DefinitionDataRow } from "../../../types";
import SavedQueriesOptions from "./saved-queries-options.component";

const query: DefinitionDataRow = {
  id: "1",
  name: "Female Patients",
  description: "Female Patients that are alive",
};

describe("Test the saved queries options", () => {
  afterEach(cleanup);
  it("should be able to view the saved query", async () => {
    const onViewQuery = jest.fn();
    const { getByTestId } = render(
      <SavedQueriesOptions
        query={query}
        onViewQuery={onViewQuery}
        deleteQuery={jest.fn()}
      />
    );

    fireEvent.click(getByTestId("options"));
    fireEvent.click(getByTestId("view"));
    expect(onViewQuery).toBeCalledWith(query.id);
  });

  it("should be able delete a query", async () => {
    const deleteQuery = jest.fn();
    const { getByText, getByTestId } = render(
      <SavedQueriesOptions
        query={query}
        onViewQuery={jest.fn()}
        deleteQuery={deleteQuery}
      />
    );

    fireEvent.click(getByTestId("options"));
    fireEvent.click(getByTestId("delete"));
    fireEvent.click(getByText("Delete"));
    expect(deleteQuery).toBeCalledWith(query.id);
  });
});
