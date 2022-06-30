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
    expect(getByTestId("last-days")).toBeInTheDocument();
    expect(getByTestId("last-months")).toBeInTheDocument();
    expect(getByLabelText("Start date")).toBeInTheDocument();
    expect(getByLabelText("End date")).toBeInTheDocument();
  });

  it("should be able to input a value for within the last months", async () => {
    const { getByTestId } = render(
      <SearchByConcepts
        resetInputs={false}
        setQueryDescription={jest.fn()}
        setSearchParams={jest.fn()}
      />
    );
    const lastMonthsInput = getByTestId("last-months");
    fireEvent.click(lastMonthsInput);
    fireEvent.change(lastMonthsInput, { target: { value: "5" } });
    expect(lastMonthsInput).toHaveValue(5);
  });

  it("should be able to input a value for within the last days", async () => {
    const { getByTestId } = render(
      <SearchByConcepts
        resetInputs={false}
        setQueryDescription={jest.fn()}
        setSearchParams={jest.fn()}
      />
    );
    const lastDaysInput = getByTestId("last-days");
    fireEvent.click(lastDaysInput);
    fireEvent.change(lastDaysInput, { target: { value: "15" } });
    expect(lastDaysInput).toHaveValue(15);
  });

  it("should be able to select a value for the time modifier", async () => {
    const { getByLabelText, getByText } = render(
      <SearchByConcepts
        resetInputs={false}
        setQueryDescription={jest.fn()}
        setSearchParams={jest.fn()}
      />
    );
    const dropdown = getByLabelText("Open menu");
    fireEvent.click(dropdown);
    fireEvent.click(getByText("Patients who do not have these observations"));
    expect(
      getByText("Patients who do not have these observations")
    ).toBeInTheDocument();
  });
});
