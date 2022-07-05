import React from "react";

import { render, cleanup } from "@testing-library/react";

import { SearchResultsTable } from "./search-results-table.component";

const mockPatients = [
  {
    firstname: "Horatio",
    gender: "M",
    patientId: 2,
    age: 81,
    lastname: "Hornblower",
    id: "2",
    name: "Horatio Hornblower",
  },
  {
    firstname: "John",
    gender: "M",
    patientId: 3,
    age: 47,
    lastname: "Patient",
    id: "3",
    name: "John Patient",
  },
];

describe("Test the search results component", () => {
  afterEach(cleanup);
  it("should render a message when there's no results to display", async () => {
    const { getByText } = render(<SearchResultsTable patients={[]} />);
    expect(getByText("There are no data to display")).toBeInTheDocument();
  });

  it("should display the search results", () => {
    const { getByText } = render(
      <SearchResultsTable patients={mockPatients} />
    );
    expect(getByText("Horatio Hornblower")).toBeInTheDocument();
    expect(getByText("47")).toBeInTheDocument();
  });
});
