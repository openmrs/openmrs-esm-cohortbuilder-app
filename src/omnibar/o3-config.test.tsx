import React from 'react';
import { render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearConfigErrors,
  defineConfigSchema,
  getExtensionConfigFromStore,
  getExtensionsConfigStore,
  provide,
  registerModuleLoad,
  registerModuleWithConfigSystem,
  resetConfigSystem,
} from '@openmrs/esm-config';
import { registerExtensionRendering, unregisterExtensionRendering } from '@openmrs/esm-extensions';
import { ComponentContext, useConfig as realUseConfig } from '@openmrs/esm-react-utils';
import { type ConfigObject, configSchema } from '../config-schema';
import { OMNIBAR_CONTRACT_VERSION, type OmnibarReport } from './omnibar-contract';
import { cohortCriteriaConfig, parseCohortCriteria } from './parse-cohort-criteria';
import CohortCountProvider from './providers/cohort-count.provider';

// The providers import useConfig from the framework, which tests alias to its mock. Here it is the real
// hook, reading the real config store.
vi.mock('@openmrs/esm-framework', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  useConfig: (...args: Parameters<typeof realUseConfig>) => realUseConfig(...args),
}));

vi.mock('react-i18next', async () => {
  const { default: i18next } = await import('i18next');
  const i18n = i18next.createInstance();
  await i18n.init({ lng: 'en', resources: { en: { translation: {} } } });
  const t = i18n.t.bind(i18n);
  return { useTranslation: () => ({ t }) };
});

const moduleName = '@openmrs/esm-cohort-builder-app';
const slotName = 'omnibar-providers-slot';
const extensionId = 'omnibar-cohort-count-provider';
const unknownKey = `Unknown config key '${moduleName}.drugCriteriaEnabled' provided. Ignoring.`;

// o3's /openmrs/spa/custom/config.json, as far as this module is concerned.
const o3Config = { [moduleName]: { drugCriteriaEnabled: true } };

const extensionConfig = () =>
  getExtensionConfigFromStore(getExtensionsConfigStore().getState(), slotName, extensionId).config;

let consoleError: ReturnType<typeof vi.spyOn>;
// Older frameworks logged the key as unknown while the module's schema was still to come; since
// 11.0.1-pre.5837 extension config waits for the module to start, so it is never logged.
const unknownKeyLogs = () => consoleError.mock.calls.filter(([message]) => message === unknownKey).length;

beforeEach(() => {
  resetConfigSystem();
  clearConfigErrors();
  consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  unregisterExtensionRendering('o3-rendering');
  consoleError.mockRestore();
});

describe("o3's config for the cohort row, through the real config system", () => {
  it('keeps drugCriteriaEnabled from before the module defines its schema, and never logs it as unknown', () => {
    provide(o3Config, '/openmrs/spa/custom/config.json');
    // registerApp, from routes.json: the module exists, with the implicit schema only.
    registerModuleWithConfigSystem(moduleName);
    expect(unknownKeyLogs()).toBe(0);

    // renderExtension registers the rendering before it loads the module's code.
    registerExtensionRendering({
      renderingId: 'o3-rendering',
      extensionName: extensionId,
      extensionModuleName: moduleName,
      extensionId,
      slotName,
      slotModuleName: '@openmrs/esm-omnibar-app',
    });
    expect(unknownKeyLogs()).toBe(0);
    // The value is kept, but none of the schema's defaults are there yet.
    expect(extensionConfig()).toMatchObject({ drugCriteriaEnabled: true });
    expect(extensionConfig()).not.toHaveProperty('omnibar');

    // loadLifeCycles: the module's startupApp, then registerModuleLoad.
    defineConfigSchema(moduleName, configSchema);
    registerModuleLoad(moduleName);
    expect(extensionConfig()).toMatchObject({ drugCriteriaEnabled: true, omnibar: { enabled: true } });
    expect(unknownKeyLogs()).toBe(0);
  });

  it('gives the mounted provider drugCriteriaEnabled, so "how many patients on ARVs" is a count row', () => {
    provide(o3Config, '/openmrs/spa/custom/config.json');
    registerModuleWithConfigSystem(moduleName);
    registerExtensionRendering({
      renderingId: 'o3-rendering',
      extensionName: extensionId,
      extensionModuleName: moduleName,
      extensionId,
      slotName,
      slotModuleName: '@openmrs/esm-omnibar-app',
    });
    defineConfigSchema(moduleName, configSchema);
    registerModuleLoad(moduleName);

    const report = vi.fn<(report: OmnibarReport) => void>();
    render(
      <ComponentContext.Provider
        value={{
          moduleName,
          featureName: 'cohort-builder',
          extension: { extensionSlotName: slotName, extensionSlotModuleName: '@openmrs/esm-omnibar-app', extensionId },
        }}
      >
        <CohortCountProvider
          query="how many patients on ARVs"
          context={{ scope: 'global', locale: 'en', workspaceGroup: null }}
          report={report}
          hints={{ looksLikeIdentifier: false }}
          contractVersion={OMNIBAR_CONTRACT_VERSION}
        />
      </ComponentContext.Provider>,
    );

    expect(report.mock.calls.at(-1)[0]).toMatchObject({
      status: 'loading',
      results: [{ title: 'Counting…', subtitle: expect.stringMatching(/^Patients who taking 13 drugs on or after /) }],
    });
  });
});

describe('omnibar.phrases through the real config system', () => {
  const configFrom = (provided: object) => {
    provide({ [moduleName]: provided }, '/openmrs/spa/custom/config.json');
    registerModuleWithConfigSystem(moduleName);
    defineConfigSchema(moduleName, configSchema);
    registerModuleLoad(moduleName);
    registerExtensionRendering({
      renderingId: 'o3-rendering',
      extensionName: extensionId,
      extensionModuleName: moduleName,
      extensionId,
      slotName,
      slotModuleName: '@openmrs/esm-omnibar-app',
    });
    return extensionConfig() as ConfigObject;
  };
  const under30 = [{ type: 'demographics', gender: 'any', maxAge: 29 }];
  const phraseErrors = () => consoleError.mock.calls.flat().filter((message) => /phrases/.test(String(message)));

  it('gives every list its empty default when unset, so the shipped table reads alone', () => {
    const config = configFrom({});
    expect(config.omnibar.phrases).toMatchObject({ under: [], stopwords: [], ageGroups: [] });
    expect(parseCohortCriteria('patients under 30', cohortCriteriaConfig(config))?.criteria).toEqual(under30);
    expect(phraseErrors()).toEqual([]);
  });

  it("adds a site's phrases when set, keeping the other lists' defaults", () => {
    const config = configFrom({ omnibar: { phrases: { under: ['younger then'] } } });
    expect(config.omnibar.phrases).toMatchObject({ under: ['younger then'], stopwords: [] });
    expect(parseCohortCriteria('patients younger then 30', cohortCriteriaConfig(config))?.criteria).toEqual(under30);
    expect(parseCohortCriteria('patients under 30', cohortCriteriaConfig(config))?.criteria).toEqual(under30);
    expect(phraseErrors()).toEqual([]);
  });
});
