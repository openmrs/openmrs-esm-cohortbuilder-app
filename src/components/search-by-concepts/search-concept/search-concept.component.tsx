import React, {
  Dispatch,
  SetStateAction,
  useState,
  useRef,
  useEffect,
} from "react";

import { Button, Column, Search, CodeSnippetSkeleton } from "@carbon/react";
import _debounce from "lodash/debounce";
import { useTranslation } from "react-i18next";

import { Concept } from "../../../types";
import { getConcepts } from "./search-concept.resource";
import styles from "./search-concept.style.css";

interface SearchConceptProps {
  concept: Concept;
  searchText: string;
  setConcept: Dispatch<SetStateAction<Concept>>;
  setSearchText: Dispatch<SetStateAction<String>>;
}

export const SearchConcept: React.FC<SearchConceptProps> = ({
  concept,
  searchText,
  setConcept,
  setSearchText,
}) => {
  const { t } = useTranslation();
  const [searchResults, setSearchResults] = useState<Concept[]>([]);
  const [searchError, setSearchError] = useState("");
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
    _debounce(async (searchText: string) => {
      if (searchText) {
        await onSearch(searchText);
      }
    }, 500)
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
        <Search
          closeButtonLabelText={t("clearSearch", "Clear search")}
          id="concept-search"
          labelText={t("searchConcepts", "Search Concepts")}
          placeholder={t("searchConcepts", "Search Concepts")}
          onChange={handleWithDebounce}
          onClear={onSearchClear}
          size="lg"
          value={searchText}
        />
        <div className={styles.search}>
          {isSearching ? (
            <CodeSnippetSkeleton type="multi" />
          ) : (
            searchResults.map((concept: Concept) => (
              <div key={concept.uuid}>
                <Button
                  kind="ghost"
                  onClick={() => handleConceptClick(concept)}
                >
                  {concept.name}
                </Button>
                <br />
              </div>
            ))
          )}
        </div>
        {concept && (
          <p className={styles.text}>
            {t("whoseAnswer", "Patients with observations whose answer is ")}
            <span className={styles.concept}>{concept.name}</span>
          </p>
        )}
        {isSearchResultsEmpty && (
          <p className={styles.text}>
            {t("noSearchItems", "There are no search items")}
          </p>
        )}
        {searchError && <span>{searchError}</span>}
      </Column>
    </div>
  );
};
