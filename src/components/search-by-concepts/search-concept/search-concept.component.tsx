import React, { type Dispatch, type SetStateAction, useState, useRef, useEffect } from 'react';
import { debounce } from 'lodash-es';
import { useTranslation } from 'react-i18next';
import { Column, InlineLoading, Search, Tile } from '@carbon/react';
import { type Concept } from '../../../types';
import { getConcepts } from './search-concept.resource';
import styles from './search-concept.scss';

interface SearchConceptProps {
  concept: Concept;
  searchText: string;
  setConcept: Dispatch<SetStateAction<Concept>>;
  setSearchText: Dispatch<SetStateAction<String>>;
}

export const SearchConcept: React.FC<SearchConceptProps> = ({ concept, searchText, setConcept, setSearchText }) => {
  const { t } = useTranslation();
  const [searchResults, setSearchResults] = useState<Concept[]>([]);
  const [searchError, setSearchError] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isSearchResultsEmpty, setIsSearchResultsEmpty] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const onSearch = async (search: string) => {
    setSearchResults([]);
    setConcept(null);
    setIsSearching(true);
    setIsSearchResultsEmpty(false);
    try {
      const concepts = await getConcepts(search);
      if (concepts.length) {
        setSearchResults(concepts);
      } else {
        setIsSearchResultsEmpty(true);
      }
      setIsSearching(false);
    } catch (error) {
      setSearchError(error.toString());
      setIsSearching(false);
    }
  };

  const debouncedSearch = useRef(
    debounce(async (searchText: string) => {
      if (searchText) {
        await onSearch(searchText);
      }
    }, 500),
  ).current;

  useEffect(() => {
    return () => {
      debouncedSearch.cancel();
    };
  }, [debouncedSearch]);

  // Scroll focused item into view
  useEffect(() => {
    if (focusedIndex >= 0 && listRef.current) {
      const focusedElement = listRef.current.querySelector(`[data-index="${focusedIndex}"]`) as HTMLElement;
      if (focusedElement) {
        focusedElement.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest'
        });
      }
    }
  }, [focusedIndex]);

  const onSearchClear = () => {
    setIsSearchResultsEmpty(false);
    setSearchResults([]);
  };

  const handleConceptClick = (concept: Concept) => {
    setConcept(concept);
    setSearchResults([]);
    setIsSearchResultsEmpty(false);
    setFocusedIndex(-1);
    // Return focus to search input for better keyboard navigation
    if (searchRef.current) {
      searchRef.current.focus();
    }
  };

  const handleWithDebounce = (event) => {
    setSearchText(event.target.value);
    setFocusedIndex(-1);
    debouncedSearch(event.target.value);
  };

  // Enhanced keyboard navigation for concept list
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (!searchResults.length) return;

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setFocusedIndex(prev => (prev < searchResults.length - 1) ? prev + 1 : 0);
        break;
      case 'ArrowUp':
        event.preventDefault();
        setFocusedIndex(prev => (prev > 0) ? prev - 1 : searchResults.length - 1);
        break;
      case 'Enter':
        if (focusedIndex >= 0) {
          event.preventDefault();
          handleConceptClick(searchResults[focusedIndex]);
        }
        break;
      case 'Escape':
        event.preventDefault();
        setFocusedIndex(-1);
        setSearchResults([]);
        setIsSearchResultsEmpty(false);
        break;
    }
  };

  const handleConceptKeyDown = (event: React.KeyboardEvent, concept: Concept) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleConceptClick(concept);
    }
  };

  return (
    <div>
      <Column className={styles.column}>
        <div className={styles.searchContainer}>
          <Search
            ref={searchRef}
            closeButtonLabelText={t('clearSearch', 'Clear search')}
            id="concept-search"
            labelText={t('searchConcepts', 'Search Concepts')}
            onChange={handleWithDebounce}
            onClear={onSearchClear}
            onKeyDown={handleKeyDown}
            placeholder={t('searchConcepts', 'Search Concepts')}
            value={searchText}
            aria-describedby="concept-search-help"
            aria-expanded={searchResults.length > 0}
            aria-haspopup="listbox"
            role="combobox"
            aria-autocomplete="list"
          />
          <div id="concept-search-help" className="sr-only">
            {t('conceptSearchHelp', 'Type to search for medical concepts. Use arrow keys to navigate results, Enter to select, Escape to close.')}
          </div>
          <div className={styles.search}>
            {isSearching ? (
              <div>
                <InlineLoading className={styles.loader} description={t('searching', 'Searching') + '...'} />
                <div aria-live="polite" aria-atomic="true" className="sr-only">
                  {t('searchingConcepts', 'Searching for concepts, please wait')}
                </div>
              </div>
            ) : (
              <ul 
                ref={listRef}
                className={styles.conceptList}
                role="listbox"
                aria-label={t('conceptSearchResults', 'Concept search results')}
                id="concept-search-results"
              >
                {searchResults?.map((concept, index) => (
                  <li
                    role="option"
                    className={`${styles.concept} ${focusedIndex === index ? styles.focused : ''}`}
                    key={index}
                    data-index={index}
                    onClick={() => handleConceptClick(concept)}
                    onKeyDown={(e) => handleConceptKeyDown(e, concept)}
                    tabIndex={0}
                    aria-selected={focusedIndex === index}
                    aria-describedby={`concept-${index}-description`}
                  >
                    {concept.name}
                    <div id={`concept-${index}-description`} className="sr-only">
                      {t('conceptOption', 'Concept option: {{name}}, press Enter to select', { name: concept.name })}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        {concept && (
          <div role="status" aria-live="polite" className={styles.text}>
            {t('patientsWithObservationsWhoseAnswerIs', 'Patients with observations whose answer is')}
            <strong> "{concept.name}"</strong>.
          </div>
        )}
        {searchText && isSearchResultsEmpty && (
          <Tile role="alert">
            <span>
              {t('noMatchingConcepts', 'No concepts were found that match')}
              <strong> "{searchText}"</strong>.
            </span>
          </Tile>
        )}
        {searchError && (
          <div role="alert" className={styles.errorMessage}>
            <span className="sr-only">{t('error', 'Error')}: </span>
            {searchError}
          </div>
        )}
      </Column>
    </div>
  );
};
