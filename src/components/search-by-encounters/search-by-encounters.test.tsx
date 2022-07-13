import React from "react";

import { render, cleanup, fireEvent } from "@testing-library/react";

import SearchByEncounters from "./search-by-encounters.component";

describe("Test the search by encounters component", () => {
  afterEach(cleanup);

  it("should be able to select input values", async () => {
    const submit = jest.fn();
    const { getByTestId } = render(<SearchByEncounters onSubmit={submit} />);
    // mockQuery.query.rowFilters[2].parameterValues.endDate = dayjs().format();
    fireEvent.click(getByTestId("search-btn"));
    // await act(async () => {
    //   expect(submit).toBeCalledWith(
    //     mockQuery,
    //     "Male Patients with ages between 10 and 20 years that are alive"
    //   );
    // });
  });
});
