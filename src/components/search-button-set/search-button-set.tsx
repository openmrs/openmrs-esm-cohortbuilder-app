import React from "react";

import {
  Button,
  ButtonSet,
  Column,
  InlineLoading,
} from "carbon-components-react";
import { useTranslation } from "react-i18next";

import styles from "./search-button-set.css";

interface SearchButtonSet {
  isLoading: boolean;
  handleSubmit: () => void;
  handleReset: () => void;
}

const SearchButtonSet: React.FC<SearchButtonSet> = ({
  isLoading,
  handleSubmit,
  handleReset,
}) => {
  const { t } = useTranslation();

  return (
    <Column sm={2} md={{ offset: 4 }} className={styles.container}>
      <ButtonSet className={styles.buttonSet}>
        <Button kind="primary" onClick={handleSubmit}>
          {isLoading ? (
            <InlineLoading description={t("loading", "Loading")} />
          ) : (
            t("search", "Search")
          )}
        </Button>
        <Button kind="secondary" onClick={handleReset}>
          {t("reset", "Reset")}
        </Button>
      </ButtonSet>
    </Column>
  );
};

export default SearchButtonSet;
