import React from "react";
import { useTranslation } from "react-i18next";
import { Layer, ClickableTile } from "@carbon/react";
import { ArrowRight } from "@carbon/react/icons";

const CohortBuilderAdminLink: React.FC = () => {
  const { t } = useTranslation();
  const header = t("manageCohorts", "Manage Cohorts");
  return (
    <Layer>
      <ClickableTile
        id={`clickable-tile-${header}`}
        href={`${window.spaBase}/cohort-builder`}
        target="_blank"
        rel="noopener noreferrer"
      >
        <div>
          <div className="heading">{header}</div>
          <div className="content">{t("cohortBuilder", "Cohort Builder")}</div>
        </div>
        <div className="iconWrapper">
          <ArrowRight size={16} />
        </div>
      </ClickableTile>
    </Layer>
  );
};

export default CohortBuilderAdminLink;
