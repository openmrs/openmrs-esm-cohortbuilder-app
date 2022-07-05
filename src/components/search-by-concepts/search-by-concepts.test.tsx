import React from "react";

import { render, cleanup, fireEvent } from "@testing-library/react";

import { SearchByConcepts } from "./search-by-concepts.component";

describe("Test the search by concept component", () => {
  afterEach(cleanup);
  it("should be able to see all the inputs", async () => {
    const { getByTestId, getByLabelText } = render(
      <SearchByConcepts
        resetInputs={false}
        setQueryDescription={jest.fn()}
        setSearchParams={jest.fn()}
      />
    );
    expect(getByTestId("timeModifier")).toBeInTheDocument();
    expect(getByLabelText("Start date")).toBeInTheDocument();
    expect(getByLabelText("End date")).toBeInTheDocument();
  });

  it("should be able to select input values", async () => {
    const { getByTestId, getByLabelText, getByText } = render(
      <SearchByConcepts
        resetInputs={false}
        setQueryDescription={jest.fn()}
        setSearchParams={jest.fn()}
      />
    );
    const lastDaysInput = getByTestId("last-days");
    fireEvent.click(lastDaysInput);
    fireEvent.change(lastDaysInput, { target: { value: "15" } });
    const lastMonthsInput = getByTestId("last-months");
    fireEvent.click(lastMonthsInput);
    fireEvent.change(lastMonthsInput, { target: { value: "4" } });
    const dropdown = getByLabelText("Open menu");
    fireEvent.click(dropdown);
    fireEvent.click(getByText("Patients who do not have these observations"));
  });
});
