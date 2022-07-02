import React, { Dispatch, SetStateAction, useEffect, useState } from "react";

import { showNotification } from "@openmrs/esm-framework";
import {
  Button,
  ComposedModal,
  DataTable,
  Form,
  ModalBody,
  ModalFooter,
  ModalHeader,
  OverflowMenu,
  OverflowMenuItem,
  Pagination,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TextInput,
} from "carbon-components-react";
import { useTranslation } from "react-i18next";

import {
  Cohort,
  PaginationData,
  Patient,
  SearchHistoryItem,
} from "../../types/types";
import EmptyData from "../empty-data/empty-data.component";
import { createCohort, createQuery } from "./search-history.resources";
import styles from "./search-history.style.scss";
import { downloadCSV, getSearchHistory } from "./search-history.utils";

interface SearchHistoryProps {
  isHistoryUpdated: boolean;
  setIsHistoryUpdated: Dispatch<SetStateAction<boolean>>;
}

enum Option {
  SAVE_COHORT,
  SAVE_QUERY,
  DOWNLOAD,
  DELETE,
}

export const SearchHistory: React.FC<SearchHistoryProps> = ({
  isHistoryUpdated,
  setIsHistoryUpdated,
}) => {
  const { t } = useTranslation();
  const [searchResults, setSearchResults] = useState<SearchHistoryItem[]>([]);
  const [selectedSearchItemId, setSelectedSearchItemId] = useState(0);
  const [cohortName, setCohortName] = useState("");
  const [cohortDescription, setCohortDescription] = useState("");
  const [queryName, setQueryName] = useState("");
  const [queryDescription, setQueryDescription] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isDeleteHistoryModalVisible, setIsDeleteHistoryModalVisible] =
    useState(false);
  const [isDeleteCohortModalVisible, setIsDeleteCohortModalVisible] =
    useState(false);
  const [isSaveCohortModalVisible, setIsSaveCohortModalVisible] =
    useState(false);
  const [isSaveQueryModalVisible, setIsSaveQueryModalVisible] = useState(false);

  useEffect(() => {
    if (isHistoryUpdated) {
      setSearchResults(getSearchHistory());
      setIsHistoryUpdated(false);
    }
  }, [isHistoryUpdated]);

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
    setIsDeleteHistoryModalVisible(false);
  };

  const saveCohort = async () => {
    const cohortMembers: number[] = [];
    const { patients } = searchResults[selectedSearchItemId];
    patients.forEach((patient: Patient) =>
      cohortMembers.push(parseInt(patient.id))
    );
    let cohort: Cohort = {
      display: cohortName,
      memberIds: cohortMembers,
      description: cohortDescription,
      name: cohortName,
    };

    try {
      await createCohort(cohort);
      setCohortName("");
      setCohortDescription("");
      setIsSaveCohortModalVisible(false);
      showNotification({
        title: t("cohortCreateSuccess", "Success"),
        kind: "success",
        critical: true,
        description: "the cohort is created",
      });
    } catch (error) {
      showNotification({
        title: t("cohortCreateError", "Error creating the cohort"),
        kind: "error",
        critical: true,
        description: error?.message,
      });
    }
  };

  const handleDeleteSearchItem = async () => {
    try {
      const updatedSearchResults = [...searchResults].filter(
        (searchResult, index) => index != selectedSearchItemId
      );
      setSearchResults(updatedSearchResults);
      window.sessionStorage.setItem(
        "openmrsHistory",
        JSON.stringify(updatedSearchResults)
      );
      setIsDeleteCohortModalVisible(false);
      showNotification({
        title: t("cohortCreateSuccess", "Success"),
        kind: "success",
        critical: true,
        description: "the search item is deleted",
      });
    } catch (error) {
      showNotification({
        title: t("cohortDeleteError", "Error deleting the search item"),
        kind: "error",
        critical: true,
        description: error?.message,
      });
    }
  };

  const saveQuery = async () => {
    try {
      const { parameters } = searchResults[selectedSearchItemId];
      parameters.name = queryName;
      parameters.description = queryDescription;
      await createQuery(parameters);
      setQueryName("");
      setQueryDescription("");
      setIsSaveQueryModalVisible(false);
      showNotification({
        title: t("queryCreateSuccess", "Success"),
        kind: "success",
        critical: true,
        description: "Successfully saved the query",
      });
    } catch (error) {
      showNotification({
        title: t("queryDeleteError", "Error saving the query"),
        kind: "error",
        critical: true,
        description: error?.message,
      });
    }
  };

  const handleOption = async (searchResultId: number, option: Option) => {
    setSelectedSearchItemId(searchResultId);
    const { patients, description } = searchResults[searchResultId];
    switch (option) {
      case Option.SAVE_COHORT:
        setCohortDescription(description);
        setIsSaveCohortModalVisible(true);
        break;
      case Option.SAVE_QUERY:
        setQueryDescription(description);
        setIsSaveQueryModalVisible(true);
        break;
      case Option.DOWNLOAD:
        downloadCSV(patients, description);
        break;
      case Option.DELETE:
        setIsDeleteCohortModalVisible(true);
        break;
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <p className={styles.heading}>{t("searchHistory", "Search History")}</p>
        {searchResults.length > 0 && (
          <Button
            kind="danger--tertiary"
            onClick={() => setIsDeleteHistoryModalVisible(true)}
          >
            {t("clearHistory", "Clear Search History")}
          </Button>
        )}
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
                      <OverflowMenu
                        ariaLabel="overflow-menu"
                        size="md"
                        flipped
                        direction="top"
                      >
                        <OverflowMenuItem
                          itemText={t("saveCohort", "Save Cohort")}
                          onClick={() =>
                            handleOption(row.id - 1, Option.SAVE_COHORT)
                          }
                        />
                        <OverflowMenuItem
                          itemText={t("saveQuery", "Save Query")}
                          onClick={() =>
                            handleOption(row.id - 1, Option.SAVE_QUERY)
                          }
                        />
                        <OverflowMenuItem
                          itemText={t("downloadResults", "Download Results")}
                          onClick={() =>
                            handleOption(row.id - 1, Option.DOWNLOAD)
                          }
                        />
                        <OverflowMenuItem
                          itemText={t("delete", "Delete")}
                          onClick={() =>
                            handleOption(row.id - 1, Option.DELETE)
                          }
                        />
                      </OverflowMenu>
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
        open={isDeleteHistoryModalVisible}
        onClose={() => setIsDeleteHistoryModalVisible(false)}
      >
        <ModalHeader>
          <p>
            {t(
              "deleteHistory",
              "Are you sure you want to delete the search history?"
            )}
          </p>
        </ModalHeader>
        <ModalFooter
          danger
          onRequestSubmit={clearHistory}
          primaryButtonText={t("delete", "Delete")}
          secondaryButtonText={t("cancel", "Cancel")}
        />
      </ComposedModal>
      <ComposedModal
        size={"sm"}
        open={isSaveCohortModalVisible}
        onClose={() => setIsSaveCohortModalVisible(false)}
      >
        <ModalHeader>
          <p>Save Cohort</p>
        </ModalHeader>
        <ModalBody hasForm>
          <Form onSubmit={saveCohort}>
            <TextInput
              data-modal-primary-focus
              required
              labelText={t("saveName", "Enter a name")}
              id="cohort-name"
              onChange={(e) => setCohortName(e.target.value)}
              value={cohortName}
            />
            <br />
            <TextInput
              data-modal-primary-focus
              required
              labelText={t("saveDescription", "Enter a description")}
              id="cohort-description"
              onChange={(e) => setCohortDescription(e.target.value)}
              value={cohortDescription}
            />
          </Form>
        </ModalBody>
        <ModalFooter
          onRequestSubmit={saveCohort}
          primaryButtonText={t("confirm", "Confirm")}
          secondaryButtonText={t("cancel", "Cancel")}
        />
      </ComposedModal>
      <ComposedModal
        size={"sm"}
        open={isSaveQueryModalVisible}
        onClose={() => setIsSaveQueryModalVisible(false)}
      >
        <ModalHeader>
          <p>Save Query</p>
        </ModalHeader>
        <ModalBody hasForm>
          <TextInput
            required
            labelText={t("saveName", "Enter a name")}
            id="query-name"
            onChange={(e) => setQueryName(e.target.value)}
            value={queryName}
          />
          <br />
          <TextInput
            required
            labelText={t("saveDescription", "Enter a description")}
            id="query-description"
            onChange={(e) => setQueryDescription(e.target.value)}
            value={queryDescription}
          />
        </ModalBody>
        <ModalFooter
          onRequestSubmit={saveQuery}
          primaryButtonText={t("confirm", "Confirm")}
          secondaryButtonText={t("cancel", "Cancel")}
        />
      </ComposedModal>
      <ComposedModal
        size={"sm"}
        open={isDeleteCohortModalVisible}
        onClose={() => setIsDeleteCohortModalVisible(false)}
      >
        <ModalHeader>
          <p>
            {t(
              "deleteHistoryItem",
              `Are you sure you want to delete ${searchResults[selectedSearchItemId]?.description} from the search history?`,
              {
                searchItemName:
                  searchResults[selectedSearchItemId]?.description,
              }
            )}
          </p>
        </ModalHeader>
        <ModalFooter
          danger
          onRequestSubmit={handleDeleteSearchItem}
          primaryButtonText={t("delete", "Delete")}
          secondaryButtonText={t("cancel", "Cancel")}
        />
      </ComposedModal>
    </div>
  );
};
