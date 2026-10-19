import React from 'react';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import { DatePicker, DatePickerInput } from '@carbon/react';
import type { Instance } from 'flatpickr/dist/types/instance';

dayjs.extend(customParseFormat);

interface SearchDatePickerProps {
  id: string;
  labelText: string;
  /** The date as an ISO 8601 string, or '' for none. */
  value: string;
  onChange: (value: string) => void;
}

/**
 * Reads typed text strictly as day-month-year, so 01-02-2024 is 1 February and 31-02-2024 is no date at all,
 * which flatpickr shows by emptying the input.
 */
const parseDate = (text: string) => {
  // Strict parsing compares the text with the date formatted back, so each way of padding needs its own format.
  const date = dayjs(text.trim(), ['DD-MM-YYYY', 'D-MM-YYYY', 'DD-M-YYYY', 'D-M-YYYY'], true);
  return date.isValid() ? date.toDate() : false;
};

/** A day-month-year date picker for a search's date bound, which can be picked or typed. */
const SearchDatePicker: React.FC<SearchDatePickerProps> = ({ id, labelText, value, onChange }) => {
  // flatpickr reports no dates when it is cleared, as Carbon does when the value is reset; that is no date, not today.
  // It reports a typed date on blur or Enter, but takes one silently when a touch outside closes the calendar, so
  // closing reports the date it holds by then too.
  const handleDates = (_dates: Date[], _dateStr: string, { selectedDates: [date] }: Instance) =>
    onChange(date ? dayjs(date).format() : '');

  return (
    <DatePicker
      dateFormat="d-m-Y"
      datePickerType="single"
      parseDate={parseDate}
      onChange={handleDates}
      onClose={handleDates}
      value={value && dayjs(value).format('DD-MM-YYYY')}
    >
      <DatePickerInput
        id={id}
        labelText={labelText}
        placeholder="DD-MM-YYYY"
        size="md"
        onChange={(event) => !event.target.value && onChange('')}
        onKeyDownCapture={(event) => {
          // Tab moves focus into the calendar, where flatpickr doesn't read typed text, so read it here.
          if (event.key === 'Tab') {
            const date = parseDate(event.currentTarget.value);
            onChange(date ? dayjs(date).format() : '');
          }
        }}
      />
    </DatePicker>
  );
};

export default SearchDatePicker;
