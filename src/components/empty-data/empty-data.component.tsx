import React from "react";

import { Layer, Tile } from "@carbon/react";
import { EmptyDataIllustration } from "@openmrs/esm-patient-common-lib/src/empty-state/index";

import styles from "./empty-data.style.scss";

export interface EmptyDataProps {
  displayText: string;
}

const EmptyData: React.FC<EmptyDataProps> = (props) => {
  return (
    <Layer>
      <Tile className={styles.tile}>
        <EmptyDataIllustration />
        <p className={styles.content}>
          There are no {props.displayText.toLowerCase()} to display
        </p>
      </Tile>
    </Layer>
  );
};

export default EmptyData;
