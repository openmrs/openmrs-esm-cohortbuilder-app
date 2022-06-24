import React from "react";

import { Tile } from "carbon-components-react";

import { EmptyDataIllustration } from "./empty-data-illustration.component";
import styles from "./empty-data.style.css";

export interface EmptyDataProps {
  displayText: string;
}

const EmptyData: React.FC<EmptyDataProps> = (props) => {
  return (
    <Tile className={styles.tile}>
      <EmptyDataIllustration />
      <p className={styles.content}>
        There are no {props.displayText.toLowerCase()} to display
      </p>
    </Tile>
  );
};

export default EmptyData;
