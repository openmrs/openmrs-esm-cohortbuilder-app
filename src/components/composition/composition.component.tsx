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
  const [compositionError, setCompositionError] = useState("");
  const { t } = useTranslation();

  const handleResetInputs = () => {
    setDescription("");
    setCompositionError("");
    setCompositionQuery("");
  };

  const submit = async () => {
    setIsLoading(true);
    setCompositionError("");
    try {
      isCompositionValid(compositionQuery);
      const searchParams = createCompositionQuery(compositionQuery);
      await onSubmit(searchParams, description);
    } catch (error) {
      setCompositionError("Composition is not valid");
    }
    setIsLoading(false);
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
      <p>
        This query combines multiple cohorts using the logical operators:-{" "}
        <strong>'AND'</strong>,<strong> 'OR'</strong>, and{" "}
        <strong>'NOT'.</strong>
      </p>
      <br />
      <p>
        To use this query, you need to have query results from the{" "}
        <strong>other queries</strong> in your <strong>search history</strong>.
        These are the queries which will then be combined to yeild new results.
      </p>
      <br />
      <p>
        <strong>Example:</strong> There is a cohort of patients who weigh less
        than 100 KG at <strong>#1</strong>, and a cohort of patients with ages
        between 23 and 35 years at <strong>#2</strong> in the search history.
        <br />
        You can create a query with a composition <strong>'1 AND 2' </strong>
        and add a brief meaningful description for the new query. To view a
        result for the combined queries.
      </p>
      <br />
      {compositionError &&
        showNotification({
          title: t("error", "Error!"),
          kind: "error",
          critical: true,
          description: t("searchIsCompleted", compositionError),
        })}
      <TextInput
        data-modal-primary-focus
        required
        labelText={t("description", "Description")}
        data-testid="cohort-name"
        id="cohort-name"
        onChange={(e) => setDescription(e.target.value)}
        value={description}
      />
      <SearchButtonSet
        onHandleReset={handleResetInputs}
        onHandleSubmit={submit}
        isLoading={isLoading}
      />
    </>
  );
};

export default Composition;
