import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { useUrlDefinition } from './use-url-definition';

// A real i18next instance with its default escapeValue: true, as in the app shell. The shared
// react-i18next mock returns default texts without interpolating, so it cannot show escaping.
vi.mock('react-i18next', async () => {
  const { default: i18next } = await import('i18next');
  const i18n = i18next.createInstance();
  await i18n.init({ lng: 'en', resources: { en: { translation: {} } } });
  return { useTranslation: () => ({ t: i18n.t.bind(i18n) }) };
});

vi.mock('@openmrs/esm-framework', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  openmrsFetch: vi.fn(async () => ({ data: { display: "PEP/PrEP <b>Don't</b>" } })),
}));

const handlers = {
  runSearch: vi.fn(async () => false),
  showCohort: vi.fn(async () => true),
  showQuery: vi.fn(async () => true),
  onHistoryChange: vi.fn(),
  onDefinition: vi.fn(),
};

function LinkError() {
  return <p data-testid="link-error">{useUrlDefinition(handlers)}</p>;
}

describe('useUrlDefinition with real i18next interpolation', () => {
  it('shows interpolated values as plain text, not escaped twice', async () => {
    const programUuid = '64f950e6-1b07-4ac0-8e7e-f3e148f3463f';
    const definition = { v: 1, criteria: [{ type: 'enrollment', programs: [programUuid] }] };
    const encoded = Buffer.from(JSON.stringify(definition)).toString('base64url');
    window.history.replaceState(null, '', `/openmrs/spa/cohort-builder?definition=${encoded}`);

    render(<LinkError />);

    await waitFor(() =>
      expect(screen.getByTestId('link-error')).toHaveTextContent(
        `The search "Patients enrolled in PEP/PrEP <b>Don't</b>" failed, so none of this link's searches were kept`,
      ),
    );
    // Literal text, not an element: React serializes the text node with escaped brackets.
    expect(screen.getByTestId('link-error')).toContainHTML("PEP/PrEP &lt;b&gt;Don't&lt;/b&gt;");
  });
});
