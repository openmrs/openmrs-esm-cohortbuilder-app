# Omnibar provider contract

Everything an app needs to add results to the O3 omnibar: the types, `withProviderBoundary`, and the helpers the host uses too. The full contract is in the omnibar repo, `docs/design/omnibar-provider-contract.md`.

**Copy this folder; bump only with the host.**

- Copy the whole folder into your app, for example as `src/omnibar-contract/`, and import from it. Don't edit the copy. Fix the original in esm-omnibar-app and copy it again.
- It imports only `react`, `react-i18next` and `@openmrs/esm-framework`, so it needs no new dependency.
- Declare the contract you were built against in your provider's `routes.json` meta: `"contract": 1`. A host that supports a lower major version won't mount your provider.
- The version changes only when the omnibar host changes it. New optional fields keep the same number, so a provider must work without them.

**Query results views.** The folder also has the types for views in `omnibar-query-results-slot` (`OmnibarViewProps`, `OmnibarViewMeta`) and `withViewBoundary`. An app that copied the folder before they were added needs to copy it again to write a view.
