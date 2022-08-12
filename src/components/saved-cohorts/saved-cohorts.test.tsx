import React from "react";

import { render, cleanup, screen, waitFor } from "@testing-library/react";

import { DefinitionDataRow } from "../../types";
import SavedCohorts from "./saved-cohorts.component";
import * as apis from "./saved-cohorts.resources";

jest.mock("./saved-cohorts.resources.ts");

const mockCohorts: DefinitionDataRow[] = [
  {
    id: "1",
    name: "Female alive",
    description: "Female Patients that are alive",
  },
  {
    id: "2",
    name: "Female ages between 10 and 30",
    description:
      "Female Patients with ages between 10 and 30 years that are alive",
  },
];

describe("Test the saved cohorts component", () => {
  afterEach(cleanup);
  it("should be able to search for a cohort", async () => {
    jest.spyOn(apis, "getCohorts").mockResolvedValue(mockCohorts);

    render(<SavedCohorts onViewCohort={jest.fn()} />);
    await waitFor(() => expect(jest.spyOn(apis, "getCohorts")));
    expect(screen.getByText(mockCohorts[0].name)).toBeInTheDocument();
    expect(screen.getByText(mockCohorts[1].name)).toBeInTheDocument();
  });
});
