import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button, ButtonSet, Column, InlineLoading } from '@carbon/react';
import styles from './search-button-set.scss';

interface SearchButtonSet {
  isLoading: boolean;
  onHandleSubmit: () => void;
  onHandleReset: () => void;
}

const SearchButtonSet: React.FC<SearchButtonSet> = ({ isLoading, onHandleSubmit, onHandleReset }) => {
  const { t } = useTranslation();

  return (
    <Column sm={2} md={{ offset: 4 }} className={styles.container}>
      <ButtonSet className={styles.buttonSet}>
        <Button className={styles.button} kind="secondary" onClick={onHandleReset} data-testid="reset-btn">
          {t('reset', 'Reset')}
        </Button>
        <Button
          className={styles.button}
          kind="primary"
          disabled={isLoading}
          onClick={onHandleSubmit}
          data-testid="search-btn"
        >
          {isLoading ? <InlineLoading description={t('loading', 'Loading')} /> : t('search', 'Search')}
        </Button>
      </ButtonSet>
    </Column>
  );
};

export default SearchButtonSet;
