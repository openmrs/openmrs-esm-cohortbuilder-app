import React from "react";

import { render, cleanup } from "@testing-library/react";

import { SearchHistory } from "./search-history.component";

describe("Test the search history component", () => {
  afterEach(cleanup);
  it("should render without failing", async () => {
    const { getByText } = render(
      <SearchHistory isHistoryUpdated={false} setIsHistoryUpdated={jest.fn()} />
    );
    expect(getByText("Search History")).toBeInTheDocument();
  });
});
