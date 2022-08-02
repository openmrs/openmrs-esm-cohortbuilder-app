import React from "react";

import { render, cleanup, screen, waitFor } from "@testing-library/react";

import { DefinitionDataRow } from "../../types";
import SavedQueries from "./saved-queries.component";
import * as apis from "./saved-queries.resource";

jest.mock("./saved-queries.resource.ts");

const mockQueries: DefinitionDataRow[] = [
  {
    id: "1",
    name: "male alive",
    description: "male Patients that are alive",
  },
  {
    id: "2",
    name: "Female ages between 10 and 30",
    description:
      "male Patients with ages between 10 and 30 years that are alive",
  },
];

describe("Test the saved queries component", () => {
  afterEach(cleanup);
  it("should be able to search for a query", async () => {
    jest.spyOn(apis, "getQueries").mockResolvedValue(mockQueries);

    render(<SavedQueries onViewQuery={jest.fn()} />);
    await waitFor(() => expect(jest.spyOn(apis, "getQueries")));
    expect(screen.getByText(mockQueries[0].name)).toBeInTheDocument();
    expect(screen.getByText(mockQueries[1].name)).toBeInTheDocument();
  });
});
