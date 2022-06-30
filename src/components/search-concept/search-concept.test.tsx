import React from "react";

import { render, cleanup, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { SearchConcept } from "./search-concept.component";

describe("Test the concept search component", () => {
  afterEach(cleanup);
  it("should be able to type a text for search", async () => {
    render(<SearchConcept concept={null} setConcept={jest.fn()} />);
    const searchInput = screen.getByPlaceholderText("Search Concepts");
    fireEvent.click(searchInput);
    await userEvent.type(searchInput, "blood");
    expect(searchInput.getAttribute("value")).toEqual("blood");
  });

  it("should be able to clear the current search value", async () => {
    const { getByLabelText, getByPlaceholderText } = render(
      <SearchConcept concept={null} setConcept={jest.fn()} />
    );
    const searchInput = getByPlaceholderText("Search Concepts");
    fireEvent.click(searchInput);
    await userEvent.type(searchInput, "blood");
    const clearButton = getByLabelText("Clear search");
    fireEvent.click(clearButton);
    expect(searchInput.getAttribute("value")).toEqual("");
  });
});
