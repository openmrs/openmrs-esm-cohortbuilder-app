import React from 'react';
import { render } from '@testing-library/react';
import CohortBuilder from './cohort-builder';

describe('Test the cohort builder', () => {
  it(`renders without dying`, () => {
    render(<CohortBuilder />);
  });
});
