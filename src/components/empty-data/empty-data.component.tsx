import React from 'react';
import { Layer, Tile } from '@carbon/react';
import { EmptyCardIllustration } from '@openmrs/esm-framework';
import styles from './empty-data.style.scss';

export interface EmptyDataProps {
  displayText: string;
}

const EmptyData: React.FC<EmptyDataProps> = (props) => {
  return (
    <Layer>
      <Tile className={styles.tile}>
        <EmptyCardIllustration />
        <p className={styles.content}>There are no {props.displayText.toLowerCase()} to display</p>
      </Tile>
    </Layer>
  );
};

export default EmptyData;
