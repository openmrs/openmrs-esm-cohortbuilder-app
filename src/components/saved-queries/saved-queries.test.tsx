import React from "react";

import {
  render,
  cleanup,
  screen,
  fireEvent,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { Response } from "../../types";
import SavedQueries from "./saved-queries.component";
import * as apis from "./saved-queries.resource";

jest.mock("./saved-queries.resource.ts");

const queries: Response[] = [
  {
    id: "1",
    uuid: "AAAAAAAAAAAAAAAAAAAAAAAAAAA",
    name: "male alive",
    display: "",
    description: "male Patients that are alive",
  },
  {
    id: "2",
    uuid: "-f326-4cac-b4cc-6efd68333847",
    name: "Female ages between 10 and 30",
    display: "",
    description:
      "male Patients with ages between 10 and 30 years that are alive",
  },
];

describe("Test the saved queries component", () => {
  afterEach(cleanup);
  it("should be able to search for a query", async () => {
    jest.spyOn(apis, "getQueries").mockResolvedValue(queries);
    const searchText = "male";
    render(<SavedQueries viewQuery={jest.fn()} />);
    const searchInput = screen.getByPlaceholderText("Search Queries");
    fireEvent.click(searchInput);
    await userEvent.type(searchInput, searchText);
    fireEvent.click(screen.getByTestId("search-queries"));
    await waitFor(() =>
      expect(jest.spyOn(apis, "getQueries")).toBeCalledWith(searchText)
    );
    expect(screen.getByText(queries[0].name)).toBeInTheDocument();
    expect(screen.getByText(queries[1].name)).toBeInTheDocument();
  });
});
