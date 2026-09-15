# Release Checks

Automated: `node tests/final-check.mjs` passes with no third-party test dependencies. It checks bundled files, text and time parsing, escaping, interval planning, overnight shifts, energy choices, idempotent personal imports and backup restoration.

The existing interface was previously checked with browser controls for task completion and persistence, focus pause/reload, source-labelled memories, meal favourites, shift-aware scheduling and phone layout. The export pass additionally checks the actual public package under `/advaita/`, including its assets, dialogs, console errors and backup restore. No design changes were made for export.

Included runtime versions and licences are documented in THIRD_PARTY.md. Runtime libraries are vendored, so there is no npm dependency download step. package.json contains only convenience scripts.

Release limitations: web app rather than a signed iOS app; local unencrypted browser storage; no live AI, Outlook, LMS, HealthKit, verified nutrient lookup, automatic health-report extraction or device sync. These are preserved as explicit unconnected integrations, not represented as working services.
