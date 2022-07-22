import React, { useState } from "react";

import { showToast } from "@openmrs/esm-framework";
import {
  Column,
  DatePicker,
  DatePickerInput,
  MultiSelect,
} from "carbon-components-react";
import dayjs from "dayjs";
import { useTranslation } from "react-i18next";

import { useLocations } from "../../cohort-builder.resource";
import { DropdownValue, SearchByProps } from "../../types";
import SearchButtonSet from "../search-button-set/search-button-set";
import { usePrograms } from "./search-by-enrollments.resource";
import styles from "./search-by-enrollments.style.scss";
import { getQueryDetails, getDescription } from "./search-by-enrollments.utils";

const SearchByEnrollments: React.FC<SearchByProps> = ({ onSubmit }) => {
  const { t } = useTranslation();
  const { programs, programsError } = usePrograms();
  const { locations, locationsError } = useLocations();
  const [enrolledOnOrAfter, setEnrolledOnOrAfter] = useState("");
  const [enrolledOnOrBefore, setEnrolledOnOrBefore] = useState("");
  const [completedOnOrAfter, setCompletedOnOrAfter] = useState("");
  const [completedOnOrBefore, setCompletedOnOrBefore] = useState("");
  const [selectedLocations, setSelectedLocations] =
    useState<DropdownValue[]>(null);
  const [selectedPrograms, setSelectedPrograms] =
    useState<DropdownValue[]>(null);
  const [isLoading, setIsLoading] = useState(false);

  if (programsError) {
    showToast({
      title: t("error", "Error"),
      kind: "error",
      critical: true,
      description: programsError?.message,
    });
  }

  if (locationsError) {
    showToast({
      title: t("error", "Error"),
      kind: "error",
      critical: true,
      description: locationsError?.message,
    });
  }

  const handleResetInputs = () => {
    setSelectedPrograms(null);
    setEnrolledOnOrAfter("");
    setEnrolledOnOrBefore("");
    setCompletedOnOrAfter("");
    setCompletedOnOrBefore("");
  };

  const submit = async () => {
    setIsLoading(true);
    const searchParams = {
      enrolledOnOrAfter,
      enrolledOnOrBefore,
      completedOnOrAfter,
      completedOnOrBefore,
      selectedPrograms,
      selectedLocations,
    };
    await onSubmit(getQueryDetails(searchParams), getDescription(searchParams));
    setIsLoading(false);
  };

  return (
    <>
      <Column>
        <div>
          <MultiSelect
            id="programs"
            data-testid="programs"
            onChange={(data) => setSelectedPrograms(data.selectedItems)}
            items={programs}
            label={t("selectPrograms", "Select programs")}
          />
        </div>
      </Column>
      <Column>
        <div>
          <MultiSelect
            id="locations"
            data-testid="locations"
            onChange={(data) => setSelectedLocations(data.selectedItems)}
            items={locations}
            label={t("selectLocations", "Select locations")}
          />
        </div>
      </Column>
      <div className={styles.column}>
        <Column>
          <DatePicker
            datePickerType="single"
            allowInput={false}
            onChange={(date) => setEnrolledOnOrAfter(dayjs(date[0]).format())}
          >
            <DatePickerInput
              id="enrolledOnOrAfter"
              labelText="Enrolled between"
              value={
                enrolledOnOrAfter &&
                dayjs(enrolledOnOrAfter).format("DD-MM-YYYY")
              }
              placeholder="DD-MM-YYYY"
              size="md"
            />
          </DatePicker>
        </Column>
        <Column>
          <DatePicker
            datePickerType="single"
            allowInput={false}
            onChange={(date) => setEnrolledOnOrBefore(dayjs(date[0]).format())}
          >
            <DatePickerInput
              id="enrolledOnOrBefore"
              labelText="and"
              value={
                enrolledOnOrBefore &&
                dayjs(enrolledOnOrBefore).format("DD-MM-YYYY")
              }
              placeholder="DD-MM-YYYY"
              size="md"
            />
          </DatePicker>
        </Column>
      </div>
      <div className={styles.column}>
        <Column>
          <DatePicker
            datePickerType="single"
            allowInput={false}
            onChange={(date) => setCompletedOnOrAfter(dayjs(date[0]).format())}
          >
            <DatePickerInput
              id="completedOnOrAfter"
              labelText="Completed between"
              value={
                completedOnOrAfter &&
                dayjs(completedOnOrAfter).format("DD-MM-YYYY")
              }
              placeholder="DD-MM-YYYY"
              size="md"
            />
          </DatePicker>
        </Column>
        <Column>
          <DatePicker
            datePickerType="single"
            allowInput={false}
            onChange={(date) => setCompletedOnOrBefore(dayjs(date[0]).format())}
          >
            <DatePickerInput
              id="completedOnOrBefore"
              labelText="and"
              value={
                completedOnOrBefore &&
                dayjs(completedOnOrBefore).format("DD-MM-YYYY")
              }
              placeholder="DD-MM-YYYY"
              size="md"
            />
          </DatePicker>
        </Column>
      </div>
      <SearchButtonSet
        onHandleReset={handleResetInputs}
        onHandleSubmit={submit}
        isLoading={isLoading}
      />
    </>
  );
};

export default SearchByEnrollments;
