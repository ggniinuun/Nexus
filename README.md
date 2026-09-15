# Advaita / not two.

An iPhone-first life workspace with a graphite theme, a draggable Three.js smoked-chrome sculpture, locally bundled typefaces and Lucide icons. One capture flow connects thoughts, plans, meals, movement and personal memory.

## Run

From this folder:

```powershell
python -m http.server 5173 --bind 127.0.0.1
```

Open http://127.0.0.1:5173/. If that port is already occupied, choose another port. The current preview is already running on 5173. No install, build step, external font request or API key is needed. JavaScript modules require the local server.

## What Works

- The sculpture rotates, responds to dragging, pauses and resets. System reduced-motion preferences are respected on first use.
- Capture text from anywhere, review the suggested type and save it. Simple rules recognise meals, tasks, movement and preferences. This is not a connected AI assistant.
- Plans support dates, times, duration, a university category, completion, editing and moving to tomorrow. A phrase such as "study at 3pm for 45 minutes" fills the appropriate fields.
- Journal entries can become memories. Memories support editing, search, local JSON import with selection, and appear in the home view.
- Meals, training sessions and measurements save to the same record store. Goals can be reached; routines can be checked off daily.
- The focus timer supports duration, pause, resume and reload recovery. Completed sessions appear in the timeline.
- The timeline and activity chart use your saved records. Preferences include your name, motion, JSON export and local deletion.
- Find some room proposes three openings around timed plans and work shifts, including overnight shifts and configurable breaks. Choosing an opening creates an editable plan. Untimed tasks and external calendars are not treated as reservations.
- Energy check-ins suggest 15, 25 or 45 minute focus blocks. They describe your reported energy, not medical readiness. Future days use their own check-ins.
- Meals can be saved as favourites. My usual meals brings back favourites or recent meals for review before logging again, alongside your imported meal preferences.

## Data And Personalisation

Entries live under `advaita.v2` in this browser's local storage. They persist across refreshes but are not encrypted or synced. Clearing browser data removes them. Export my data creates a private JSON backup. Import memories accepts this backup and restores records, favourites, name, motion preference and context without overwriting matching existing records. A transferred active timer is restored paused. Localhost and a deployed website have separate browser stores.

The four Claude ZIPs have now been supplied and inspected locally. The archive contains 94 conversations (3,032 messages), a memory collection, a design-chat file and account metadata. This focused first pass reviewed the memories and selected recent user messages about university, training, food and design preferences. It is not an exhaustive interpretation of all conversations or attachments.

Nine curated, source-labelled memories are in the Git-ignored `private/context.json`. The app imports this snapshot once per browser store, preserves existing records and does not reinsert edited/deleted memories on reload. The snapshot personalises study suggestions and distinguishes the two university units. Old health discussions remain outside measured health records. Raw exports remain in the separate, ignored working directory, outside the served app.

The private snapshot is served only as part of this local preview when `config.json` has `loadPrivateContext: true`. The public release sets that flag to false and omits private files. Never publish the `private/` folder. Clearing browser storage allows the local snapshot to import again; remove `private/context.json` or disable that flag to prevent future imports. The in-app erase action removes browser entries and suggestions and preserves the import receipt to prevent immediate reimport. No app AI or external account was connected by this import.

The previous illustrative health scores and assignments have been removed. The home screen starts with an empty day and clearly labelled suggestions. AI, Outlook, LMS, HealthKit, DEXA extraction, notifications and verified Australian nutrient datasets are still unconnected. Food capture saves your words without guessing nutrient totals.

## Files

- `index.html`: application shell and accessible navigation.
- `styles.css`: responsive design and local typefaces.
- `app.js`: capture, views, actions, focus and import workflows.
- `core.js`: data schema, persistence, date handling, text classification and safe text extraction.
- `scene.js`: Three.js renderer, environment, interaction and motion.
- `personal-context.js`: one-time merging of a curated private snapshot.
- `rhythm.js`, `rhythm-ui.js`: free-time planning, energy check-ins and reusable meals.
- `vendor/`, `fonts/`: pinned local assets; see `THIRD_PARTY.md`.

## iPhone Path

This is a working web interface, not a native iOS binary. The computer's loopback preview is accessible only on the computer. The public application shell can be hosted on GitHub Pages and opened in iPhone Safari. Personal entries stay in each browser, with no automatic device sync. Only deploy the public release; it contains no Claude data. See DEPLOYMENT.md.

For a native version, keep the common record schema, use a WKWebView/Capacitor host for the existing scene, and bridge native HealthKit, notifications, document access and Keychain capabilities. A complete SwiftUI version would replace the browser views and storage. Building and signing either native path requires Xcode and an Apple signing setup.

## Verification

Run `node tests/final-check.mjs` (or `npm test`) for portable checks. No npm install is required. Final verification covers bundled assets, parsing, escaping, schedule conflicts, overnight shifts, energy, private context and backup restoration. Browser checks cover phone/desktop layouts and the deployed subfolder path; details are in CHECKS.md.
