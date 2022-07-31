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

enum Options {
  VIEW,
  DELETE,
}

interface SavedQueriesOptionsProps {
  query: Response;
  viewQuery: (queryId: string) => Promise<void>;
  deleteQuery: (queryId: string) => Promise<void>;
}

const SavedQueriesOptions: React.FC<SavedQueriesOptionsProps> = ({
  query,
  viewQuery,
  deleteQuery,
}) => {
  const { t } = useTranslation();
  const [isDeleteQueryModalVisible, setIsDeleteQueryModalVisible] =
    useState(false);

  const handleOption = async (option: Options) => {
    switch (option) {
      case Options.VIEW:
        handleViewQuery();
        break;
      case Options.DELETE:
        setIsDeleteQueryModalVisible(true);
        break;
    }
  };

  const handleViewQuery = async () => {
    try {
      await viewQuery(query.uuid);
      showToast({
        title: t("success", "Success"),
        kind: "success",
        critical: true,
        description: t("searchCompleted", "Search is completed"),
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
    await deleteQuery(query.uuid);
    setIsDeleteQueryModalVisible(false);
  };

  return (
    <>
      <OverflowMenu
        ariaLabel="overflow-menu"
        size="md"
        flipped
        direction="bottom"
        data-testid="options"
      >
        <OverflowMenuItem
          data-testid="view"
          itemText={t("view", "View")}
          onClick={() => handleOption(Options.VIEW)}
        />
        <OverflowMenuItem
          data-testid="delete"
          itemText={t("delete", "Delete")}
          onClick={() => handleOption(Options.DELETE)}
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
