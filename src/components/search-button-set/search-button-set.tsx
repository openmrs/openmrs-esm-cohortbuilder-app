import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button, ButtonSet, Column, InlineLoading } from '@carbon/react';
import styles from './search-button-set.scss';

interface SearchButtonSet {
  isLoading: boolean;
  onHandleSubmit: () => void;
  onHandleReset: () => void;
  submitError?: string;
}

const SearchButtonSet: React.FC<SearchButtonSet> = ({ isLoading, onHandleSubmit, onHandleReset, submitError }) => {
  const { t } = useTranslation();

  return (
    <Column sm={2} md={{ offset: 4 }} className={styles.container}>
      {/* Accessible loading state announcement */}
      {isLoading && (
        <div aria-live="assertive" aria-atomic="true" className="sr-only">
          {t('searchingPatients', 'Searching for patients, please wait...')}
        </div>
      )}
      
      {/* Error message announcement */}
      {submitError && (
        <div role="alert" aria-live="assertive" className={styles.errorMessage}>
          <span className="sr-only">{t('error', 'Error')}: </span>
          {submitError}
        </div>
      )}
      
      <ButtonSet className={styles.buttonSet}>
        <Button 
          className={styles.button} 
          kind="secondary" 
          onClick={onHandleReset} 
          data-testid="reset-btn"
          aria-describedby="reset-help"
          disabled={isLoading}
        >
          {t('reset', 'Reset')}
        </Button>
        <div id="reset-help" className="sr-only">
          {t('resetHelp', 'Clear all search criteria and start over')}
        </div>
        
        <Button
          className={styles.button}
          kind="primary"
          disabled={isLoading}
          onClick={onHandleSubmit}
          data-testid="search-btn"
          aria-describedby="search-help"
          aria-label={isLoading ? t('searchingInProgress', 'Search in progress') : t('search', 'Search')}
        >
          {isLoading ? <InlineLoading description={t('loading', 'Loading')} /> : t('search', 'Search')}
        </Button>
        <div id="search-help" className="sr-only">
          {t('searchHelp', 'Execute the search with the current criteria to find matching patients')}
        </div>
      </ButtonSet>
    </Column>
  );
};

export default SearchButtonSet;
