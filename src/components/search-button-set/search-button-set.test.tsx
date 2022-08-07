import React from "react";

import { render, fireEvent, act } from "@testing-library/react";

import SearchButtonSet from "./search-button-set";

describe("Test the search button set component", () => {
  it("should be able search and reset", () => {
    const handleSubmit = jest.fn();
    const handleReset = jest.fn();
    const { getByTestId } = render(
      <SearchButtonSet
        onHandleReset={handleReset}
        onHandleSubmit={handleSubmit}
        isLoading={false}
      />
    );
    act(() => {
      fireEvent.click(getByTestId("reset-btn"));
    });
    expect(handleReset).toBeCalled();
    act(() => {
      fireEvent.click(getByTestId("search-btn"));
    });
    expect(handleSubmit).toBeCalled();
  });
});
