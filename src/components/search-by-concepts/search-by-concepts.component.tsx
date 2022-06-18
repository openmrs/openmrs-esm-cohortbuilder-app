import React from "react";
import {
  ButtonSet,
  Button,
  DatePicker,
  DatePickerInput,
  Grid,
  Column,
  Search,
  Dropdown,
} from "carbon-components-react";
import { getConcepts } from "./search-by-concepts.resource";

export const SearchByConcepts: React.FC = () => {
  return (
    <div>
      Search By Concepts
      <Grid>
        <Column>
          <Search
            closeButtonLabelText="Clear search input"
            id="search-1"
            labelText="Search"
            onChange={(event) => getConcepts(event.target.value)}
            onKeyDown={function noRefCheck() {}}
            size="lg"
          />
        </Column>
        <Column sm={2} md={{ span: 2, offset: 1 }}>
          <Dropdown
            helperText="This is some helper text"
            id="default"
            items={[
              {
                id: "option-0",
                text: "Lorem, ipsum dolor sit amet consectetur adipisicing elit.",
              },
              {
                id: "option-1",
                text: "Option 1",
              },
            ]}
            label=""
            titleText=""
          />
        </Column>
        <Column>Date Range :</Column>
        <Column sm={2} md={{ span: 4, offset: 1 }}>
          <DatePicker datePickerType="range">
            <DatePickerInput
              id="date-picker-input-id-start"
              labelText="Start date"
              placeholder="mm/dd/yyyy"
              size="md"
            />
            <DatePickerInput
              id="date-picker-input-id-finish"
              labelText="End date"
              placeholder="mm/dd/yyyy"
              size="md"
            />
          </DatePicker>
        </Column>
        <Column sm={2} md={{ span: 4, offset: 6 }}>
          <ButtonSet>
            <Button kind="primary">Search</Button>
            <Button kind="secondary">Reset</Button>
          </ButtonSet>
        </Column>
      </Grid>
    </div>
  );
};
