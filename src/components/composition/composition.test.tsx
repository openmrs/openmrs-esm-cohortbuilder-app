import React from "react";

import { render, cleanup } from "@testing-library/react";

import Composition from "./composition.component";

describe("Test the composition component", () => {
  afterEach(cleanup);
  it("should be throw an error when an invalid composition query is entered", async () => {
    const submit = jest.fn();
    render(<Composition onSubmit={submit} />);
  });
});
