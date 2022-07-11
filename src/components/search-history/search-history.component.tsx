import React, { Dispatch, SetStateAction, useEffect, useState } from "react";

import {
  Button,
  ComposedModal,
  DataTable,
  ModalFooter,
  ModalHeader,
  Pagination,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "carbon-components-react";
import { useTranslation } from "react-i18next";

import mainStyle from "../../cohort-builder.scss";
import { PaginationData, SearchHistoryItem } from "../../types";
import EmptyData from "../empty-data/empty-data.component";
import SearchHistoryOptions from "./search-history-options/search-history-options.component";
import styles from "./search-history.style.scss";
import { getSearchHistory } from "./search-history.utils";

interface SearchHistoryProps {
  isHistoryUpdated: boolean;
  setIsHistoryUpdated: Dispatch<SetStateAction<boolean>>;
}

const SearchHistory: React.FC<SearchHistoryProps> = ({
  isHistoryUpdated,
  setIsHistoryUpdated,
}) => {
  const { t } = useTranslation();
  const [searchResults, setSearchResults] = useState<SearchHistoryItem[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isClearHistoryModalVisible, setIsClearHistoryModalVisible] =
    useState(false);

  useEffect(() => {
    if (isHistoryUpdated) {
      setSearchResults(getSearchHistory());
      setIsHistoryUpdated(false);
    }
  }, [isHistoryUpdated, setIsHistoryUpdated]);

  const handlePagination = ({ page, pageSize }: PaginationData) => {
    setPage(page);
    setPageSize(pageSize);
  };

  const headers = [
    {
      key: "id",
      header: "#",
    },
    {
      key: "description",
      header: t("query", "Query"),
    },
    {
      key: "results",
      header: t("results", "Results"),
    },
  ];

  const clearHistory = () => {
    window.sessionStorage.removeItem("openmrsHistory");
    setSearchResults([]);
    setIsClearHistoryModalVisible(false);
  };

  const updateSearchHistory = (selectedSearchItem: SearchHistoryItem) => {
    const updatedSearchResults = [...searchResults].filter(
      (searchResult, index) =>
        index != searchResults.indexOf(selectedSearchItem)
    );
    setSearchResults(updatedSearchResults);
    window.sessionStorage.setItem(
      "openmrsHistory",
      JSON.stringify(updatedSearchResults)
    );
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <p className={mainStyle.heading}>
          {t("searchHistory", "Search History")}
        </p>
        {searchResults.length > 0 && (
          <Button
            kind="danger--tertiary"
            onClick={() => setIsClearHistoryModalVisible(true)}
          >
            {t("clearHistory", "Clear Search History")}
          </Button>
        )}
      </div>
      <DataTable rows={searchResults} headers={headers} useZebraStyles>
        {({ rows, headers, getTableProps, getHeaderProps, getRowProps }) => (
          <Table {...getTableProps()}>
            <TableHead>
              <TableRow>
                {headers.map((header) => (
                  <TableHeader {...getHeaderProps({ header })}>
                    {header.header}
                  </TableHeader>
                ))}
                <TableHeader className={styles.optionHeader}></TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows
                .slice((page - 1) * pageSize)
                .slice(0, pageSize)
                .map((row) => (
                  <TableRow {...getRowProps({ row })}>
                    {row.cells.map((cell) => (
                      <TableCell key={cell.id}>{cell.value}</TableCell>
                    ))}
                    <TableCell className={styles.optionCell}>
                      <SearchHistoryOptions
                        searchItem={searchResults[row.id - 1]}
                        updateSearchHistory={updateSearchHistory}
                      />
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        )}
      </DataTable>
      {searchResults.length > 10 && (
        <Pagination
          backwardText={t("previousPage", "Previous page")}
          forwardText={t("nextPage", "Next page")}
          itemsPerPageText={t("itemsPerPage:", "Items per page:")}
          onChange={handlePagination}
          page={1}
          pageSize={10}
          pageSizes={[10, 20, 30, 40, 50]}
          size="md"
          totalItems={searchResults.length}
        />
      )}
      {!searchResults.length && <EmptyData displayText="history" />}
      <ComposedModal
        size={"sm"}
        open={isClearHistoryModalVisible}
        onClose={() => setIsClearHistoryModalVisible(false)}
      >
        <ModalHeader>
          <p>
            {t(
              "clearHistoryMsg",
              "Are you sure you want to clear the search history?"
            )}
          </p>
        </ModalHeader>
        <ModalFooter
          danger
          onRequestSubmit={clearHistory}
          primaryButtonText={t("clear", "Clear")}
          secondaryButtonText={t("cancel", "Cancel")}
        />
      </ComposedModal>
    </div>
  );
};

export default SearchHistory;
