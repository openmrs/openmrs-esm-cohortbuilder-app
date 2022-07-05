import React from "react";

import { render, cleanup } from "@testing-library/react";

import SearchButtonSet from "./search-button-set";

describe("Test the search button set component", () => {
  afterEach(cleanup);
  it("should be able to see all the buttons", async () => {
    const { getByTestId } = render(
      <SearchButtonSet
        handleReset={jest.fn()}
        handleSubmit={jest.fn()}
        isLoading={false}
      />
    );
    expect(getByTestId("search-btn")).toBeInTheDocument();
    expect(getByTestId("reset-btn")).toBeInTheDocument();
  });
});
