import React from "react";

import {
  render,
  cleanup,
  screen,
  fireEvent,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { SearchConcept } from "./search-concept.component";
import * as apis from "./search-concept.resource";

jest.mock("./search-concept.resource.ts");

describe("Test the concept search component", () => {
  afterEach(cleanup);
  it("should be able to search for a concept", async () => {
    render(<SearchConcept concept={null} setConcept={jest.fn()} />);
    const searchInput = screen.getByPlaceholderText("Search Concepts");
    fireEvent.click(searchInput);
    await userEvent.type(searchInput, "blood");
    await waitFor(() =>
      expect(jest.spyOn(apis, "getConcepts")).toBeCalledWith("blood")
    );
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
