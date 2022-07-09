import React from "react";

import { render, cleanup } from "@testing-library/react";

import { SearchByPersonAttributes } from "./search-by-person-attributes.component";

describe("Test the search by person attributes component", () => {
  afterEach(cleanup);

  it("should be able to select input values", () => {
    render(
      <SearchByPersonAttributes
        setQueryDescription={jest.fn()}
        setSearchParams={jest.fn()}
        resetInputs={false}
      />
    );
  });
});
