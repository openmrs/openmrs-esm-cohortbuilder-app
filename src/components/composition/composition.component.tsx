import React, { useState } from "react";

import { showNotification } from "@openmrs/esm-framework";
import { TextInput } from "carbon-components-react";
import { useTranslation } from "react-i18next";

import { SearchByProps } from "../../types";
import SearchButtonSet from "../search-button-set/search-button-set";
import {
  createCompositionQuery,
  isCompositionValid,
} from "./composition.utils";

const Composition: React.FC<SearchByProps> = ({ onSubmit }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [compositionQuery, setCompositionQuery] = useState("");
  const [description, setDescription] = useState("");
  const { t } = useTranslation();

  const handleResetInputs = () => {
    setDescription("");
    setCompositionQuery("");
  };

  const submit = async () => {
    setIsLoading(true);
    try {
      if (isCompositionValid(compositionQuery)) {
        const searchParams = createCompositionQuery(compositionQuery);
        await onSubmit(searchParams, description);
      } else {
        showNotification({
          title: t("error", "Error!"),
          kind: "error",
          critical: true,
          description: t("invalidComposition", "Composition is not valid"),
        });
      }
      setIsLoading(false);
    } catch (error) {
      setIsLoading(false);
      showNotification({
        title: t("error", "Error!"),
        kind: "error",
        critical: true,
        description: t("invalidComposition", "Composition is not valid"),
      });
    }
  };

  return (
    <>
      <TextInput
        data-modal-primary-focus
        required
        labelText={t("composition", "Composition")}
        data-testid="composition-name"
        id="composition-name"
        onChange={(e) => setCompositionQuery(e.target.value)}
        value={compositionQuery}
      />
      <br />
      <TextInput
        data-modal-primary-focus
        required
        labelText={t("description", "Description")}
        data-testid="composition-description"
        id="composition-description"
        onChange={(e) => setDescription(e.target.value)}
        value={description}
      />
      <br />
      <p>
        {t(
          "compositionExplanationOne",
          "This query combines multiple cohorts using the logical operators:- AND,OR and NOT."
        )}
      </p>
      <br />
      <p>
        {t(
          "compositionExplanationTwo",
          "To use this query, you need to have query results from the other queries in your search history. These are the queries which will then be combined to yield new results."
        )}
      </p>
      <br />
      <p>
        {t(
          "compositionExplanationThree",
          "Example: There is a cohort of patients who are males at #1, and a cohort of patients with ages between 23 and 35 years at #2 in the search history."
        )}
      </p>
      <br />
      <p>
        {t(
          "compositionExplanationFour",
          "You can create a query with a composition '1 AND 2' and add a brief meaningful description for the new query."
        )}
      </p>
      <SearchButtonSet
        onHandleReset={handleResetInputs}
        onHandleSubmit={submit}
        isLoading={isLoading}
      />
    </>
  );
};

export default Composition;
