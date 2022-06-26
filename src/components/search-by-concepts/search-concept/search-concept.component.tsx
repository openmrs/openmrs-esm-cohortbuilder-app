import React, { Dispatch, SetStateAction, useState } from "react";

import {
  Button,
  Column,
  Search,
  CodeSnippetSkeleton,
} from "carbon-components-react";
import _debounce from "lodash/debounce";

import { Concept } from "../../../types/types";
import { getConcepts } from "./search-concept.resource";
import styles from "./search-concept.style.css";

interface SearchConceptProps {
  concept: Concept;
  setConcept: Dispatch<SetStateAction<Concept>>;
}

export const SearchConcept: React.FC<SearchConceptProps> = ({
  concept,
  setConcept,
}) => {
  const [searchResults, setSearchResults] = useState<Concept[]>([]);
  const [searchText, setSearchText] = useState("");
  const [searchError, setSearchError] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [isSearchResultsEmpty, setIsSearchResultsEmpty] = useState(false);

  const onSearch = async (search: string) => {
    setSearchResults([]);
    setIsSearching(true);
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

  const debounceFn = _debounce(onSearch, 500);

  const onSearchClear = () => {
    setIsSearchResultsEmpty(false);
    setSearchResults([]);
  };

  const handleConceptClick = (concept: Concept) => {
    setConcept(concept);
    setSearchResults([]);
  };

  const handleWithDebounce = (event) => {
    setSearchText(event.target.value);
    debounceFn(event.target.value);
  };

  return (
    <div>
      <Column className={styles.column}>
        <Search
          closeButtonLabelText="Clear search"
          id="concept-search"
          labelText="Search Concepts"
          placeholder="Search Concepts"
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
            Patients with observations whose answer is{" "}
            <span className={styles.concept}>{concept.name}</span>
          </p>
        )}
        {isSearchResultsEmpty && (
          <p className={styles.text}>There are no search items</p>
        )}
        {searchError && <span>{searchError}</span>}
      </Column>
    </div>
  );
};
