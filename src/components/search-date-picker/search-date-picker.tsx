import React from 'react';
import dayjs from 'dayjs';
import { DatePicker, DatePickerInput } from '@carbon/react';

interface SearchDatePickerProps {
  id: string;
  labelText: string;
  /** The date as an ISO 8601 string, or '' for none. */
  value: string;
  onChange: (value: string) => void;
}

/** A day-month-year date picker for a search's date bound. */
const SearchDatePicker: React.FC<SearchDatePickerProps> = ({ id, labelText, value, onChange }) => {
  // flatpickr reports no dates when it is cleared, as Carbon does when the value is reset; that is no date, not today.
  const handleChange = ([date]: Date[]) => onChange(date ? dayjs(date).format() : '');

  return (
    <DatePicker
      dateFormat="d-m-Y"
      datePickerType="single"
      allowInput={false}
      onChange={handleChange}
      value={value && dayjs(value).format('DD-MM-YYYY')}
    >
      <DatePickerInput id={id} labelText={labelText} placeholder="DD-MM-YYYY" size="md" />
    </DatePicker>
  );
};

export default SearchDatePicker;
