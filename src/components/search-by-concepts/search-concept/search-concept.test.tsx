import React from "react";

import {
  render,
  cleanup,
  screen,
  fireEvent,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { Concept } from "../../../types/types";
import { SearchConcept } from "./search-concept.component";
import * as apis from "./search-concept.resource";

jest.mock("./search-concept.resource.ts");

const concepts: Concept[] = [
  {
    uuid: "1000AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
    units: "",
    answers: [],
    hl7Abbrev: "ZZ",
    name: "Whole blood sample",
    description: "Blood samples not seperated into subtypes",
    datatype: {
      uuid: "8d4a4c94-c2cc-11de-8d13-0010c6dffd0f",
      name: "N/A",
      description: "Not associated with a datatype (e.g., term answers, sets)",
      hl7Abbreviation: "ZZ",
    },
  },
  {
    uuid: "2a08da66-f326-4cac-b4cc-6efd68333847",
    units: "mg/dl",
    answers: [],
    hl7Abbrev: "NM",
    name: "BLOOD SUGAR",
    description: "Laboratory measurement of the glucose level in the blood.",
    datatype: {
      uuid: "8d4a4488-c2cc-11de-8d13-0010c6dffd0f",
      name: "Numeric",
      description:
        "Numeric value, including integer or float (e.g., creatinine, weight)",
      hl7Abbreviation: "NM",
    },
  },
];

describe("Test the concept search component", () => {
  afterEach(cleanup);
  it("should be able to search for a concept", async () => {
    jest.spyOn(apis, "getConcepts").mockResolvedValue(concepts);
    render(<SearchConcept concept={null} setConcept={jest.fn()} />);
    const searchInput = screen.getByPlaceholderText("Search Concepts");
    fireEvent.click(searchInput);
    await userEvent.type(searchInput, "blood s");
    await waitFor(() =>
      expect(jest.spyOn(apis, "getConcepts")).toBeCalledWith("blood s")
    );
    expect(screen.getByText("BLOOD SUGAR")).toBeInTheDocument();
    expect(screen.getByText("Whole blood sample")).toBeInTheDocument();
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
