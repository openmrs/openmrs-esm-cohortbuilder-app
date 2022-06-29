import React, { Dispatch, SetStateAction, useEffect, useState } from "react";

import {
  DataTable,
  Table,
  TableHead,
  TableRow,
  TableHeader,
  TableBody,
  TableCell,
  Button,
  OverflowMenu,
  OverflowMenuItem,
  ComposedModal,
  ModalHeader,
  ModalFooter,
} from "carbon-components-react";
import { useTranslation } from "react-i18next";

import EmptyData from "../empty-data/empty-data.component";
import styles from "./search-history.style.scss";
import { getSearchHistory } from "./search-history.utils";

interface SearchHistoryProps {
  isHistoryUpdated: boolean;
  setIsHistoryUpdated: Dispatch<SetStateAction<boolean>>;
}

export const SearchHistory: React.FC<SearchHistoryProps> = ({
  isHistoryUpdated,
  setIsHistoryUpdated,
}) => {
  const { t } = useTranslation();
  const [searchResults, setSearchResults] = useState([]);
  const [isDeleteHistoryModalVisible, setIsDeleteHistoryModalVisible] =
    useState(false);
  const [isSaveCohortModalVisible, setIsSaveCohortModalVisible] =
    useState(false);

  useEffect(() => {
    if (isHistoryUpdated) {
      setSearchResults(getSearchHistory());
      setIsHistoryUpdated(false);
    }
  }, [isHistoryUpdated]);

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
    setIsDeleteHistoryModalVisible(false);
  };

  const saveCohort = () => {};

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <p className={styles.heading}>{t("searchHistory", "Search History")}</p>
        <Button
          kind="danger--tertiary"
          onClick={() => setIsDeleteHistoryModalVisible(true)}
        >
          {t("clearHistory", "Clear Search History")}
        </Button>
      </div>
      <DataTable rows={searchResults} headers={headers}>
        {({ rows, headers, getTableProps, getHeaderProps, getRowProps }) => (
          <Table {...getTableProps()}>
            <TableHead>
              <TableRow>
                {headers.map((header) => (
                  <TableHeader {...getHeaderProps({ header })}>
                    {header.header}
                  </TableHeader>
                ))}
                <TableHeader></TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row) => (
                <TableRow {...getRowProps({ row })}>
                  {row.cells.map((cell) => (
                    <TableCell key={cell.id}>{cell.value}</TableCell>
                  ))}
                  <TableCell>
                    <OverflowMenu ariaLabel="overflow-menu" size="md">
                      <OverflowMenuItem
                        itemText="Save Cohort"
                        onClick={() => setIsSaveCohortModalVisible(true)}
                      />
                      <OverflowMenuItem itemText="Save Query" />
                      <OverflowMenuItem itemText="Download" />
                      <OverflowMenuItem itemText="Delete" />
                    </OverflowMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </DataTable>
      {!searchResults.length && <EmptyData displayText="history" />}
      <ComposedModal
        size={"xs"}
        open={isDeleteHistoryModalVisible}
        onClose={() => setIsDeleteHistoryModalVisible(false)}
      >
        <ModalHeader>
          <p>Are you sure you want to delete the search history?</p>
        </ModalHeader>
        <ModalFooter
          onRequestSubmit={clearHistory}
          primaryButtonText="Confirm"
          secondaryButtonText="Cancel"
        />
      </ComposedModal>
      <ComposedModal
        size={"xs"}
        open={isSaveCohortModalVisible}
        onClose={() => setIsSaveCohortModalVisible(false)}
      >
        <ModalHeader>
          <p>Save Cohort</p>
        </ModalHeader>
        <ModalFooter
          onRequestSubmit={saveCohort}
          primaryButtonText="Confirm"
          secondaryButtonText="Cancel"
        />
      </ComposedModal>
    </div>
  );
};
