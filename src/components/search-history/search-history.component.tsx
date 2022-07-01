import React, { Dispatch, SetStateAction, useEffect, useState } from "react";

import { showNotification } from "@openmrs/esm-framework";
import {
  Button,
  ComposedModal,
  DataTable,
  ModalBody,
  ModalFooter,
  ModalHeader,
  OverflowMenu,
  OverflowMenuItem,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TextInput,
} from "carbon-components-react";
import { useTranslation } from "react-i18next";

import { Cohort, Patient, SearchHistoryItem } from "../../types/types";
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
  const [queryName, setQueryName] = useState("");
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
    const { patients, description } = searchResults[selectedSearchItemId];
    patients.forEach((patient: Patient) =>
      cohortMembers.push(parseInt(patient.id))
    );
    let cohort: Cohort = {
      display: cohortName,
      memberIds: cohortMembers,
      description: description,
      name: cohortName,
    };

    try {
      await createCohort(cohort);
      setCohortName("");
      setIsSaveCohortModalVisible(false);
      showNotification({
        title: t("cohortCreateSuccess", "Successfully created the cohort"),
        kind: "success",
        critical: true,
        description: "Successfully created the cohort",
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
      const updatedSearchResults = [...searchResults].splice(
        selectedSearchItemId,
        1
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
        description: "Successfully deleted the search item",
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
      await createQuery(parameters);
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
    switch (option) {
      case Option.SAVE_COHORT:
        setIsSaveCohortModalVisible(true);
        break;
      case Option.SAVE_QUERY:
        setIsSaveQueryModalVisible(true);
        break;
      case Option.DOWNLOAD:
        const { patients, description } = searchResults[searchResultId];
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
                        onClick={() =>
                          handleOption(row.id - 1, Option.SAVE_COHORT)
                        }
                      />
                      <OverflowMenuItem
                        itemText="Save Query"
                        onClick={() =>
                          handleOption(row.id - 1, Option.SAVE_QUERY)
                        }
                      />
                      <OverflowMenuItem
                        itemText="Download"
                        onClick={() =>
                          handleOption(row.id - 1, Option.DOWNLOAD)
                        }
                      />
                      <OverflowMenuItem
                        itemText="Delete"
                        onClick={() => handleOption(row.id - 1, Option.DELETE)}
                      />
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
        <ModalBody hasForm>
          <TextInput
            data-modal-primary-focus
            required
            labelText="Enter a name for the cohort"
            id="cohort-name"
            onChange={(e) => setCohortName(e.target.value)}
            value={cohortName}
          />
        </ModalBody>
        <ModalFooter
          onRequestSubmit={saveCohort}
          primaryButtonText="Confirm"
          secondaryButtonText="Cancel"
        />
      </ComposedModal>
      <ComposedModal
        size={"xs"}
        open={isSaveQueryModalVisible}
        onClose={() => setIsSaveQueryModalVisible(false)}
      >
        <ModalHeader>
          <p>Save Query</p>
        </ModalHeader>
        <ModalBody hasForm>
          <TextInput
            data-modal-primary-focus
            required
            labelText="Enter a name for the query"
            id="cohort-name"
            onChange={(e) => setQueryName(e.target.value)}
            value={queryName}
          />
        </ModalBody>
        <ModalFooter
          onRequestSubmit={saveQuery}
          primaryButtonText="Confirm"
          secondaryButtonText="Cancel"
        />
      </ComposedModal>
      <ComposedModal
        size={"xs"}
        open={isDeleteCohortModalVisible}
        onClose={() => setIsDeleteCohortModalVisible(false)}
      >
        <ModalHeader>
          <p>{`Are you sure you want to delete cohort?`}</p>
        </ModalHeader>
        <ModalFooter
          onRequestSubmit={handleDeleteSearchItem}
          primaryButtonText="Delete"
          secondaryButtonText="Cancel"
        />
      </ComposedModal>
    </div>
  );
};
