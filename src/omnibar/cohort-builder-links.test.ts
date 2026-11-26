import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { interpolateUrl } from '@openmrs/esm-framework';
import { readUrlRequest } from '../url-definition/url-definition';
import { cohortBuilderPath, definitionUrl, savedCohortUrl, savedQueryUrl } from './cohort-builder-links';

const uuid = '8673ee4f-e2ab-4077-ba55-4980f408773e';
const paramsOf = (url: string) => new URLSearchParams(url.split('?')[1]);

describe('cohort builder links', () => {
  it('puts the definition in the definition parameter, as the builder reads it', () => {
    const definition = { v: 1 as const, criteria: [{ type: 'demographics' as const, gender: 'female' as const }] };
    const url = definitionUrl(definition);
    expect(url.startsWith('${openmrsSpaBase}/cohort-builder?definition=')).toBe(true);
    expect(readUrlRequest(paramsOf(url))).toEqual({ type: 'definition', definition });
  });

  describe('once the framework fills in the SPA base', () => {
    const { getOpenmrsSpaBase } = window;
    // As the app shell sets it: with a trailing slash.
    beforeAll(() => (window.getOpenmrsSpaBase = () => '/openmrs/spa/'));
    afterAll(() => (window.getOpenmrsSpaBase = getOpenmrsSpaBase));

    it('lands on the cohort builder page', () => {
      // interpolateUrl trims the base's trailing slash, so the path brings its own.
      const definition = definitionUrl({ v: 1, criteria: [{ type: 'demographics', gender: 'male' }] });
      expect(interpolateUrl(cohortBuilderPath)).toBe('/openmrs/spa/cohort-builder');
      expect(interpolateUrl(definition)).toMatch(/^\/openmrs\/spa\/cohort-builder\?definition=[A-Za-z0-9_-]+$/);
      expect(interpolateUrl(savedCohortUrl(uuid))).toBe(`/openmrs/spa/cohort-builder?cohort=${uuid}`);
      expect(interpolateUrl(savedQueryUrl(uuid))).toBe(`/openmrs/spa/cohort-builder?query=${uuid}`);
    });
  });

  it('makes no link for a definition the builder would refuse', () => {
    expect(
      definitionUrl({ v: 1, label: 'x'.repeat(4100), criteria: [{ type: 'demographics', minAge: 1 }] }),
    ).toBeNull();
    expect(definitionUrl({ v: 1, criteria: [] })).toBeNull();
  });

  it('links saved cohorts and queries by uuid, as the builder reads them', () => {
    expect(readUrlRequest(paramsOf(savedCohortUrl(uuid)))).toEqual({ type: 'cohort', uuid });
    expect(readUrlRequest(paramsOf(savedQueryUrl(uuid)))).toEqual({ type: 'query', uuid });
  });
});
