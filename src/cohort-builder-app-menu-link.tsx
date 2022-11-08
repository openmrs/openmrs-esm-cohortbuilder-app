import React from "react";

import { ConfigurableLink } from "@openmrs/esm-framework";
import { useTranslation } from "react-i18next";

export default function CohortBuilderAppMenuLink() {
  const { t } = useTranslation();

  return (
    <ConfigurableLink to="${openmrsSpaBase}/cohort-builder">
      {t("cohortBuilder", "Cohort Builder")}
    </ConfigurableLink>
  );
}
