import React from "react";

import { openmrsFetch } from "@openmrs/esm-framework";
import { render, cleanup, screen, waitFor } from "@testing-library/react";

import { DefinitionDataRow } from "../../types";
import SavedCohorts from "./saved-cohorts.component";
import { getCohorts } from "./saved-cohorts.resources";

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

const mockOpenmrsFetch = openmrsFetch as jest.Mock;

jest.mock("./saved-cohorts.resources", () => {
  const original = jest.requireActual("./saved-cohorts.resources");
  return {
    ...original,
    getCohorts: jest.fn(),
  };
});

describe("Test the saved cohorts component", () => {
  afterEach(() => {
    cleanup();
    jest.restoreAllMocks();
  });
  it("should be able to search for a cohort", async () => {
    // @ts-ignore
    getCohorts.mockImplementation(() => mockCohorts);
    mockOpenmrsFetch.mockReturnValue({ data: { results: mockCohorts } });

    render(<SavedCohorts onViewCohort={jest.fn()} />);
    await waitFor(() =>
      expect(screen.getByText(mockCohorts[0].name)).toBeInTheDocument()
    );

    expect(screen.getByText(mockCohorts[1].name)).toBeInTheDocument();
  });
});
