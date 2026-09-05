# Fontes

News dashboard builder on a freeform canvas, for building views on Iris. Visual
language follows Apple Freeform: full-bleed dotted board, floating pills, SF Pro
system stack.

Story data comes from the deployed Fontes API; the dashboard-builder fixtures in
`src/news/` are still mocked. Authentication lives in the separate
[fontes-auth](https://github.com/MateusAMP2119/fontes-auth) repo (see below).

## Stack

- Vite + React 19 + TypeScript
- `motion` for the board cross-fade; everything else is CSS transitions
- Plain CSS: `src/index.css` (tokens) and `src/App.css` (everything else)
- `oxlint` for linting. No test runner is currently wired up.

## Scripts

```sh
npm install
npm run dev       # http://localhost:5173
npm run dev:functions  # Pages Functions on :8789, needs a `dist/` from npm run build
npm run build
npm run preview
npm run lint
```

## What it does

A new page opens **pick-topic mode**: a prompt composer centred on the empty
board. Search or browse mocked news events, narrow them by category, region,
time or tone, and pick one. The chosen event builds a dashboard — a grid of
widgets laid out inside the desktop frame, which then behave as ordinary
freeform items you can drag, select and delete.

A board keeps its topic once picked, so the composer does not come back if you
delete every widget. To start a blank board instead, insert anything from the
toolbar.

## Layout

| Path | What lives there |
| --- | --- |
| `src/workspace/` | `Workspace` / `Board` / `Folder` model, localStorage persistence |
| `src/items/` | The `Item` union — text, sticky, note, table, viz, ink |
| `src/news/` | Mocked events, seeded generators, filters, dashboard layout |
| `src/components/picker/` | The topic composer and its pick→build transition |
| `src/camera/` | `Point` and `clamp`, left over from when the board panned |

### Mock data

`src/news/events.ts` holds ~24 hand-written events with invented outlet names.
Everything numeric — daily volume, outlet breakdown, tone split, KPIs — is
generated in `src/news/series.ts` from a seeded PRNG keyed on
`` `${eventId}:${metric}` ``. That seed is a pure function of persisted state,
so a widget renders identical numbers across reloads without storing any of
them.

Recency filtering measures against `NEWS_NOW` (the newest story in the fixture
set), not the wall clock — the fixtures are static, so anchoring to `Date.now()`
would quietly empty every time window as they aged out.

### Persistence

The whole workspace is one localStorage blob under `fontes.workspace.v2`,
written on every state change. `loadWorkspace()` validates the envelope,
migrates a legacy v1 payload, and drops items whose type no longer exists.

## Board notes

- The board is **fixed** — no pan, no zoom. Items live in viewport coordinates
  relative to `.stage-viewport`.
- `.stage-world` is a positioning layer with `pointer-events: none`; items opt
  back in. Without that it covers the device frames and swallows their clicks.
- The dashboard grid is measured once, at pick time, with `offsetLeft` /
  `offsetWidth` rather than `getBoundingClientRect` — the frame sits inside a
  `motion.div` that animates `scale`, and client rects are post-transform.
# Authentication

Sign-in, sessions and organizations are served by the
[fontes-auth](https://github.com/MateusAMP2119/fontes-auth) Worker under
`/api/auth/*`. This app ships the Better Auth client (`src/auth.ts`) and talks
to that route on its own origin, so cookies never cross domains.

`/api/projects` is this app's own endpoint, a Pages Function in
`functions/api/projects.ts`. It validates the cookie by asking the auth Worker
over the `AUTH` service binding and reads the `project` table through the
`AUTH_DB` binding, which points at the auth database (fontes-auth owns its
migrations, including that table).

## Local development

Three servers make up the full local setup; the last one is only needed to
list or create projects.

1. In a checkout of fontes-auth, `npm run dev` starts the auth Worker on
   `http://localhost:8787` against the cloud D1 database. Google credentials
   live in that repo's `.dev.vars`.
2. Here, `npm run dev` serves the app on `http://localhost:5173` and proxies
   `/api/auth` to the Worker. Keep both ports fixed: Google callbacks and
   browser cookies must belong to the same origin.
3. For projects, `npm run build` once, then `npm run dev:functions` runs the
   Pages Functions on `http://localhost:8789`; Vite proxies `/api/projects`
   there. Wrangler's dev registry resolves the `AUTH` binding to the Worker
   from step 1, and `AUTH_DB` is remote, so sessions and projects line up.

Step 1 and 2 are enough for sign-in, onboarding and the feed. Without step 3,
the projects list reads as empty and creating one fails.

With the servers running, `node --test scripts/auth-regression.test.mjs`
drives the login forms in a browser. These tests mock every auth response and
never create accounts or send email. They cover password-manager fills without
change events, submission, confirmation, password reset and native-control
spacing. They do not automate Apple Keychain or complete a real Google login.
