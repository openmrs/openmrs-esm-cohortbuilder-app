import React, { type Dispatch, type SetStateAction, useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import debounce from 'lodash-es/debounce';
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

  const onSearchClear = () => {
    setIsSearchResultsEmpty(false);
    setSearchResults([]);
  };

  const handleConceptClick = (concept: Concept) => {
    setConcept(concept);
    setSearchResults([]);
    setIsSearchResultsEmpty(false);
  };

  const handleWithDebounce = (event) => {
    setSearchText(event.target.value);
    debouncedSearch(event.target.value);
  };

  return (
    <div>
      <Column className={styles.column}>
        <div className={styles.searchContainer}>
          <Search
            closeButtonLabelText={t('clearSearch', 'Clear search')}
            id="concept-search"
            labelText={t('searchConcepts', 'Search Concepts')}
            onChange={handleWithDebounce}
            onClear={onSearchClear}
            placeholder={t('searchConcepts', 'Search Concepts')}
            value={searchText}
          />
          <div className={styles.search}>
            {isSearching ? (
              <InlineLoading className={styles.loader} description={t('searching', 'Searching') + '...'} />
            ) : (
              <ul className={styles.conceptList}>
                {searchResults?.map((concept, index) => (
                  <li
                    role="menuitem"
                    className={styles.concept}
                    key={index}
                    onClick={() => handleConceptClick(concept)}
                  >
                    {concept.name}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        {concept && (
          <span className={styles.text}>
            {t('patientsWithObservationsWhoseAnswerIs', 'Patients with observations whose answer is')}
            <strong> "{concept.name}".</strong>
          </span>
        )}
        {searchText && isSearchResultsEmpty && (
          <Tile>
            <span>
              {t('noMatchingConcepts', 'No concepts were found that match')}
              <strong> "{searchText}".</strong>
            </span>
          </Tile>
        )}
        {searchError && <span>{searchError}</span>}
      </Column>
    </div>
  );
};
