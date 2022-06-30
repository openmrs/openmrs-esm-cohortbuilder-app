import React from "react";

import { render, cleanup } from "@testing-library/react";

import CohortBuilder from "./cohort-builder";

describe("Test the cohort builder", () => {
  afterEach(cleanup);
  it(`renders without dying`, () => {
    render(<CohortBuilder />);
  });
});
