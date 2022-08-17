import React from "react";

import { screen, render, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import SearchButtonSet from "./search-button-set";

describe("Test the search button set component", () => {
  it("should be able search and reset", async () => {
    const user = userEvent.setup();
    const handleSubmit = jest.fn();
    const handleReset = jest.fn();
    render(
      <SearchButtonSet
        onHandleReset={handleReset}
        onHandleSubmit={handleSubmit}
        isLoading={false}
      />
    );

    await user.click(screen.getByTestId("reset-btn"));
    await waitFor(() => expect(handleReset).toBeCalled());
    await user.click(screen.getByTestId("search-btn"));
    await waitFor(() => expect(handleSubmit).toBeCalled());
  });
});
