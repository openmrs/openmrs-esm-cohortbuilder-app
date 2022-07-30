import React, { useState } from "react";

import { showToast } from "@openmrs/esm-framework";
import {
  ComposedModal,
  ModalFooter,
  ModalHeader,
  OverflowMenu,
  OverflowMenuItem,
} from "carbon-components-react";
import { useTranslation } from "react-i18next";

import { Response } from "../../../types";
import { deleteCohort } from "./saved-cohorts-options.resources";

enum Option {
  VIEW,
  DELETE,
}

interface SavedCohortsOptionsProps {
  cohort: Response;
  viewCohort: (queryId: string) => Promise<void>;
}

const SavedCohortsOptions: React.FC<SavedCohortsOptionsProps> = ({
  cohort,
  viewCohort,
}) => {
  const { t } = useTranslation();
  const [isDeleteCohortModalVisible, setIsDeleteCohortModalVisible] =
    useState(false);

  const handleViewCohort = async () => {
    try {
      await viewCohort(cohort.uuid);
      showToast({
        title: t("cohortCreateSuccess", "Success"),
        kind: "success",
        critical: true,
        description: "the cohort is deleted",
      });
    } catch (error) {
      showToast({
        title: t("cohortDeleteError", "Error deleting the cohort"),
        kind: "error",
        critical: true,
        description: error?.message,
      });
    }
  };

  const handleOption = async (option: Option) => {
    switch (option) {
      case Option.VIEW:
        handleViewCohort();
        break;
      case Option.DELETE:
        setIsDeleteCohortModalVisible(true);
        break;
    }
  };

  const handleDeleteCohort = async () => {
    try {
      await deleteCohort(cohort.uuid);
      setIsDeleteCohortModalVisible(false);
      showToast({
        title: t("cohortCreateSuccess", "Success"),
        kind: "success",
        critical: true,
        description: "the cohort is deleted",
      });
    } catch (error) {
      showToast({
        title: t("cohortDeleteError", "Error deleting the cohort"),
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
          data-testid="view"
          itemText={t("view", "View")}
          onClick={() => handleOption(Option.VIEW)}
        />
        <OverflowMenuItem
          data-testid="delete"
          itemText={t("delete", "Delete")}
          onClick={() => handleOption(Option.DELETE)}
        />
      </OverflowMenu>

      <ComposedModal
        size={"sm"}
        open={isDeleteCohortModalVisible}
        onClose={() => setIsDeleteCohortModalVisible(false)}
      >
        <ModalHeader>
          <p>
            {t(
              "deleteHistoryItem",
              `Are you sure you want to delete ${cohort?.name}?`,
              {
                searchItemName: cohort?.name,
              }
            )}
          </p>
        </ModalHeader>
        <ModalFooter
          danger
          onRequestSubmit={handleDeleteCohort}
          primaryButtonText={t("delete", "Delete")}
          secondaryButtonText={t("cancel", "Cancel")}
        />
      </ComposedModal>
    </>
  );
};

export default SavedCohortsOptions;
