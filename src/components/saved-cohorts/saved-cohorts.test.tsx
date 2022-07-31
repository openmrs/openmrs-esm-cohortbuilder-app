import React from "react";

import {
  render,
  cleanup,
  screen,
  fireEvent,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { Cohort } from "../../types";
import SavedCohorts from "./saved-cohorts.component";
import * as apis from "./saved-cohorts.resource";

jest.mock("./saved-cohorts.resource.ts");

const cohorts: Cohort[] = [
  {
    id: "1",
    uuid: "1000AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
    name: "Female alive",
    description: "Female Patients that are alive",
  },
  {
    id: "2",
    uuid: "2a08da66-f326-4cac-b4cc-6efd68333847",
    name: "Female ages between 10 and 30",
    description:
      "Female Patients with ages between 10 and 30 years that are alive",
  },
];

describe("Test the saved cohorts component", () => {
  afterEach(cleanup);
  it("should be able to search for a cohort", async () => {
    jest.spyOn(apis, "getCohorts").mockResolvedValue(cohorts);
    const searchText = "female";
    render(<SavedCohorts viewCohort={jest.fn()} />);
    const searchInput = screen.getByPlaceholderText("Search Cohorts");
    fireEvent.click(searchInput);
    await userEvent.type(searchInput, searchText);
    fireEvent.click(screen.getByTestId("search-cohorts"));
    await waitFor(() =>
      expect(jest.spyOn(apis, "getCohorts")).toBeCalledWith(searchText)
    );
    expect(screen.getByText(cohorts[0].name)).toBeInTheDocument();
    expect(screen.getByText(cohorts[1].name)).toBeInTheDocument();
  });
});
