import React from "react";

import { render, cleanup } from "@testing-library/react";

import { SearchByDemographics } from "./search-by-demographics.component";

describe("Test the search by demographics component", () => {
  afterEach(cleanup);

  it("should be able to select input values", () => {
    render(
      <SearchByDemographics
        setQueryDescription={jest.fn()}
        setSearchParams={jest.fn()}
        resetInputs={false}
      />
    );
  });
});
