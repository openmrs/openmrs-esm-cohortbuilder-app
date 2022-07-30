import React, { useState } from "react";

import { showToast } from "@openmrs/esm-framework";
import {
  Button,
  ComposedModal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  OverflowMenu,
  OverflowMenuItem,
  TextInput,
} from "carbon-components-react";
import { useTranslation } from "react-i18next";

import { downloadCSV } from "../../../cohort-builder.utils";
import { Cohort, Patient, SearchHistoryItem } from "../../../types";
import { createCohort, createQuery } from "./search-history-options.resources";

enum Option {
  SAVE_COHORT,
  SAVE_QUERY,
  DOWNLOAD,
  DELETE,
}

interface SearchHistoryOptions {
  searchItem: SearchHistoryItem;
  updateSearchHistory: (selectedSearchItem: SearchHistoryItem) => void;
}

const SearchHistoryOptions: React.FC<SearchHistoryOptions> = ({
  searchItem,
  updateSearchHistory,
}) => {
  const { t } = useTranslation();
  const [cohortName, setCohortName] = useState("");
  const [cohortDescription, setCohortDescription] = useState("");
  const [queryName, setQueryName] = useState("");
  const [queryDescription, setQueryDescription] = useState("");
  const [isDeleteCohortModalVisible, setIsDeleteCohortModalVisible] =
    useState(false);
  const [isSaveCohortModalVisible, setIsSaveCohortModalVisible] =
    useState(false);
  const [isSaveQueryModalVisible, setIsSaveQueryModalVisible] = useState(false);

  const handleOption = async (option: Option) => {
    const { patients, description } = searchItem;
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

  const saveCohort = async () => {
    const cohortMembers: number[] = [];
    const { patients } = searchItem;
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
      showToast({
        title: t("cohortCreateSuccess", "Success"),
        kind: "success",
        critical: true,
        description: "the cohort is saved",
      });
    } catch (error) {
      showToast({
        title: t("cohortCreateError", "Error creating the cohort"),
        kind: "error",
        critical: true,
        description: error?.message,
      });
    }
  };

  const handleDeleteSearchItem = async () => {
    try {
      updateSearchHistory(searchItem);
      setIsDeleteCohortModalVisible(false);
      showToast({
        title: t("cohortCreateSuccess", "Success"),
        kind: "success",
        critical: true,
        description: "the search item is deleted",
      });
    } catch (error) {
      showToast({
        title: t("cohortDeleteError", "Error deleting the search item"),
        kind: "error",
        critical: true,
        description: error?.message,
      });
    }
  };

  const saveQuery = async () => {
    try {
      const { parameters } = searchItem;
      parameters.name = queryName;
      parameters.description = queryDescription;
      await createQuery(parameters);
      setQueryName("");
      setQueryDescription("");
      setIsSaveQueryModalVisible(false);
      showToast({
        title: t("queryCreateSuccess", "Success"),
        kind: "success",
        critical: true,
        description: "the query is saved",
      });
    } catch (error) {
      showToast({
        title: t("queryDeleteError", "Error saving the query"),
        kind: "error",
        critical: true,
        description: error?.message,
      });
    }
  };

  return (
    <>
      <OverflowMenu
        ariaLabel="overflow-menu"
        size="md"
        flipped
        direction="top"
        data-testid="options"
      >
        <OverflowMenuItem
          data-testid="save-cohort"
          itemText={t("saveCohort", "Save Cohort")}
          onClick={() => handleOption(Option.SAVE_COHORT)}
        />
        <OverflowMenuItem
          data-testid="save-query"
          itemText={t("saveQuery", "Save Query")}
          onClick={() => handleOption(Option.SAVE_QUERY)}
        />
        <OverflowMenuItem
          itemText={t("downloadResults", "Download Results")}
          onClick={() => handleOption(Option.DOWNLOAD)}
        />
        <OverflowMenuItem
          data-testid="deleteFromHistory"
          itemText={t("deleteFromHistory", "Delete from history")}
          onClick={() => handleOption(Option.DELETE)}
        />
      </OverflowMenu>

      <ComposedModal
        size={"sm"}
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
            labelText={t("saveName", "Enter a name")}
            data-testid="cohort-name"
            id="cohort-name"
            onChange={(e) => setCohortName(e.target.value)}
            value={cohortName}
          />
          <br />
          <TextInput
            data-modal-primary-focus
            required
            labelText={t("saveDescription", "Enter a description")}
            data-testid="cohort-description"
            id="cohort-description"
            onChange={(e) => setCohortDescription(e.target.value)}
            value={cohortDescription}
          />
        </ModalBody>
        <ModalFooter>
          <Button
            kind="secondary"
            onClick={() => setIsSaveCohortModalVisible(false)}
          >
            {t("cancel", "Cancel")}
          </Button>
          <Button
            data-testid="cohort-save-button"
            kind="primary"
            onClick={saveCohort}
          >
            {t("save", "Save")}
          </Button>
        </ModalFooter>
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
            data-testid="query-name"
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
        <ModalFooter>
          <Button
            kind="secondary"
            onClick={() => setIsSaveQueryModalVisible(false)}
          >
            {t("cancel", "Cancel")}
          </Button>
          <Button
            data-testid="query-save-button"
            kind="primary"
            onClick={saveQuery}
          >
            {t("save", "Save")}
          </Button>
        </ModalFooter>
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
              `Are you sure you want to delete ${searchItem?.description} from the search history?`,
              {
                searchItemName: searchItem?.description,
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
    </>
  );
};

export default SearchHistoryOptions;
