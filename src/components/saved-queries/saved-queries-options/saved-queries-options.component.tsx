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
import { deleteDataSet } from "./saved-queries-options.resources";

enum Option {
  VIEW,
  DELETE,
}

interface SavedQueriesOptionsProps {
  query: Response;
  viewQuery: (queryId: string) => Promise<void>;
}

const SavedQueriesOptions: React.FC<SavedQueriesOptionsProps> = ({
  query,
  viewQuery,
}) => {
  const { t } = useTranslation();
  const [isDeleteQueryModalVisible, setIsDeleteQueryModalVisible] =
    useState(false);

  const handleOption = async (option: Option) => {
    switch (option) {
      case Option.VIEW:
        handleViewQuery();
        break;
      case Option.DELETE:
        setIsDeleteQueryModalVisible(true);
        break;
    }
  };

  const handleViewQuery = async () => {
    try {
      await viewQuery(query.uuid);
      showToast({
        title: t("QueryCreateSuccess", "Success"),
        kind: "success",
        critical: true,
        description: "the search is completed",
      });
    } catch (error) {
      showToast({
        title: t("QueryDeleteError", "Something went wrong"),
        kind: "error",
        critical: true,
        description: error?.message,
      });
    }
  };

  const handleDeleteQuery = async () => {
    try {
      await deleteDataSet(query.uuid);
      setIsDeleteQueryModalVisible(false);
      showToast({
        title: t("QueryCreateSuccess", "Success"),
        kind: "success",
        critical: true,
        description: "the query is deleted",
      });
    } catch (error) {
      showToast({
        title: t("QueryDeleteError", "Something went wrong"),
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
          data-testid="deleteFromHistory"
          itemText={t("deleteFromHistory", "Delete")}
          onClick={() => handleOption(Option.DELETE)}
        />
      </OverflowMenu>

      <ComposedModal
        size={"sm"}
        open={isDeleteQueryModalVisible}
        onClose={() => setIsDeleteQueryModalVisible(false)}
      >
        <ModalHeader>
          <p>
            {t(
              "deleteItem",
              `Are you sure you want to delete ${query?.name}?`,
              {
                item: query?.name,
              }
            )}
          </p>
        </ModalHeader>
        <ModalFooter
          danger
          onRequestSubmit={handleDeleteQuery}
          primaryButtonText={t("delete", "Delete")}
          secondaryButtonText={t("cancel", "Cancel")}
        />
      </ComposedModal>
    </>
  );
};

export default SavedQueriesOptions;
