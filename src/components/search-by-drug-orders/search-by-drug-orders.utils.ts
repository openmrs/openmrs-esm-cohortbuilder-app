import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import { formatDate } from '@openmrs/esm-framework';
import { composeJson } from '../../cohort-builder.utils';
import { type DrugOrderDetails } from './../../types/index';

dayjs.extend(customParseFormat);

/**
 * Safely parses a date string (either YYYY-MM-DD or full ISO) as a local date
 * to prevent western timezones from shifting backward via UTC midnight parsing.
 */
const parseLocalDate = (dateString: string) => {
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day);
  }
  return new Date(dateString);
};

export const getDescription = ({
  selectedDrugs,
  selectedCareSetting,
  activeOnOrBefore,
  activeOnOrAfter,
  activatedOnOrBefore,
  activatedOnOrAfter,
}: DrugOrderDetails) => {
  let description =
    'Patients who taking ' +
    selectedDrugs
      .map((drug) => drug.label)
      .join(', ')
      .replace(/,(?=[^,]*$)/, ' and');

  if (selectedCareSetting) {
    description += ` from ${selectedCareSetting.label}`;
  }

  if (activeOnOrAfter) {
    const date = formatDate(parseLocalDate(activeOnOrAfter), { mode: 'standard' });
    if (activeOnOrBefore) {
      description += ` from ${date}`;
    } else {
      description += ` on or after ${date}`;
    }
  }

  if (activeOnOrBefore) {
    const date = formatDate(parseLocalDate(activeOnOrBefore), { mode: 'standard' });
    if (activeOnOrAfter) {
      description += ` to ${date}`;
    } else {
      description += ` on or before ${date}`;
    }
  }

  if (activatedOnOrAfter) {
    const date = formatDate(parseLocalDate(activatedOnOrAfter), { mode: 'standard' });
    if (activatedOnOrBefore) {
      description += ` from ${date}`;
    } else {
      description += ` on or after ${date}`;
    }
  }

  if (activatedOnOrBefore) {
    const date = formatDate(parseLocalDate(activatedOnOrBefore), {
      mode: 'standard',
    });
    if (activatedOnOrAfter) {
      description += ` to ${date}`;
    } else {
      description += ` on or before ${date}`;
    }
  }

  return description;
};

export const getQueryDetails = ({
  selectedDrugs,
  selectedCareSetting,
  activeOnOrBefore,
  activeOnOrAfter,
  activatedOnOrBefore,
  activatedOnOrAfter,
}: DrugOrderDetails) => {
  const searchParams = { drugOrderSearch: [] };
  if (activeOnOrAfter) {
    searchParams.drugOrderSearch.push({
      name: 'activeOnOrAfter',
      value: activeOnOrAfter,
    });
  }

  if (activatedOnOrAfter) {
    searchParams.drugOrderSearch.push({
      name: 'activatedOnOrAfter',
      value: activatedOnOrAfter,
    });
  }

  if (activatedOnOrBefore) {
    searchParams.drugOrderSearch.push({
      name: 'activatedOnOrBefore',
      value: activatedOnOrBefore,
    });
  }

  if (selectedCareSetting) {
    searchParams.drugOrderSearch.push({
      name: 'careSetting',
      value: selectedCareSetting.value,
    });
  }

  if (selectedDrugs.length) {
    searchParams.drugOrderSearch.push({
      name: 'drugs',
      value: selectedDrugs.map((form) => form.value),
    });
  }

  if (activeOnOrBefore) {
    searchParams.drugOrderSearch.push({
      name: 'activeOnOrBefore',
      value: activeOnOrBefore,
    });
  }

  return composeJson(searchParams);
};