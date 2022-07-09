import React, {
  Dispatch,
  SetStateAction,
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  DatePicker,
  DatePickerInput,
  Column,
  NumberInput,
  Switch,
  ContentSwitcher,
} from "carbon-components-react";
import dayjs from "dayjs";
import { useTranslation } from "react-i18next";

import { SearchParams } from "../../types";
import styles from "./search-by-demographics.style.scss";
import {
  getDescription,
  getQueryDetails,
} from "./search-by-demographics.utils";

interface SearchByDemographicsProps {
  setQueryDescription: Dispatch<SetStateAction<String>>;
  setSearchParams: Dispatch<SetStateAction<SearchParams>>;
  resetInputs: boolean;
}

export const SearchByDemographics: React.FC<SearchByDemographicsProps> = ({
  setQueryDescription,
  setSearchParams,
  resetInputs,
}) => {
  const { t } = useTranslation();
  const [livingStatus, setLivingStatus] = useState("alive");
  const [gender, setGender] = useState("all");
  const [birthDayStartDate, setBirthDayStartDate] = useState("");
  const [birthDayEndDate, setBirthDayEndDate] = useState("ANY");
  const [minAge, setMinAge] = useState(0);
  const [maxAge, setMaxAge] = useState(0);

  const genders = [
    {
      id: 0,
      label: t("all", "All"),
      value: "all",
    },
    {
      id: 1,
      label: t("males", "Male"),
      value: "males",
    },
    {
      id: 3,
      label: t("females", "Female"),
      value: "females",
    },
  ];

  const livingStatuses = [
    {
      id: 0,
      label: t("alive", "Alive"),
      value: "alive",
    },
    {
      id: 1,
      label: t("dead", "Dead"),
      value: "dead",
    },
  ];

  useEffect(() => {
    if (resetInputs) {
      handleResetInputs();
    }
  }, [resetInputs]);

  const handleBirthDay = (dates: Date[]) => {
    setBirthDayStartDate(dayjs(dates[0]).format());
    setBirthDayEndDate(dayjs(dates[1]).format());
  };

  const handleResetInputs = () => {
    setMaxAge(0);
    setMinAge(0);
    setBirthDayEndDate("");
    setBirthDayStartDate("");
  };

  const handleInputValues = useCallback(() => {
    const demographics = {
      gender,
      minAge,
      maxAge,
      birthDayStartDate,
      birthDayEndDate,
      livingStatus,
    };
    setQueryDescription(getDescription(demographics));
    setSearchParams(getQueryDetails(demographics));
  }, [
    birthDayEndDate,
    birthDayStartDate,
    gender,
    livingStatus,
    maxAge,
    minAge,
    setQueryDescription,
    setSearchParams,
  ]);

  useEffect(() => {
    handleInputValues();
  }, [handleInputValues]);

  return (
    <div className={styles.container}>
      <Column>
        <p className={`${styles.text} ${styles.genderTitle}`}>
          {t("gender", "Gender")}
        </p>
        <div className={styles.genderContainer}>
          <div className={styles.switch}>
            <ContentSwitcher
              selectedIndex={genders[0].id}
              className={styles.contentSwitcher}
              size="lg"
              onChange={({ index }) => setGender(genders[index].value)}
            >
              {genders.map((gender) => (
                <Switch
                  key={gender.id}
                  name={gender.value}
                  text={gender.label}
                />
              ))}
            </ContentSwitcher>
          </div>
          <div className={styles.switch}>
            <ContentSwitcher
              selectedIndex={livingStatuses[0].id}
              className={styles.contentSwitcher}
              size="lg"
              onChange={({ index }) =>
                setLivingStatus(livingStatuses[index].value)
              }
            >
              {livingStatuses.map((livingStatus) => (
                <Switch
                  key={livingStatus.id}
                  name={livingStatus.value}
                  text={livingStatus.label}
                />
              ))}
            </ContentSwitcher>
          </div>
        </div>
      </Column>
      <div className={styles.column}>
        <Column md={2}>
          <p className={styles.text}>{t("age", "Age")}</p>
        </Column>
        <Column className={styles.age}>
          <div className={styles.multipleInputs}>
            <NumberInput
              id="minAge"
              data-testid="minAge"
              label={t("between", "Between")}
              invalidText={t(
                "minAgeIsNotValid",
                "The age must be greater than 0"
              )}
              min={0}
              size="sm"
              value={minAge}
              onChange={(event) => setMinAge(event.imaginaryTarget.value)}
            />
          </div>
          <div className={styles.multipleInputs}>
            <NumberInput
              id="maxAge"
              data-testid="maxAge"
              label={t("and", "and")}
              invalidText={t(
                "maxAgeIsNotValid",
                "The age must be less than 200"
              )}
              min={0}
              max={200}
              size="sm"
              value={maxAge}
              onChange={(event) => setMaxAge(event.imaginaryTarget.value)}
            />
          </div>
        </Column>
      </div>
      <div className={styles.column}>
        <Column md={2}>
          <p className={styles.text}>{t("birthDate", "Birth date")}</p>
        </Column>
        <Column>
          <DatePicker
            datePickerType="range"
            dateFormat="d-m-Y"
            allowInput={false}
            onChange={(dates: Date[]) => handleBirthDay(dates)}
          >
            <DatePickerInput
              id="date-picker-input-id-start"
              labelText={t("between", "Between")}
              placeholder="DD-MM-YYYY"
              size="md"
            />
            <DatePickerInput
              id="date-picker-input-id-finish"
              labelText={t("and", "and")}
              placeholder="DD-MM-YYYY"
              size="md"
            />
          </DatePicker>
        </Column>
      </div>
    </div>
  );
};
