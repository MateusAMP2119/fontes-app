# Fontes

News dashboard builder on a freeform canvas, for building views on Iris. Visual
language follows Apple Freeform: full-bleed dotted board, floating pills, SF Pro
system stack.

News data is read through the Pages API. Account and workspace data use Fontes API.

## Stack

- Vite + React 19 + TypeScript
- `motion` for the board cross-fade; everything else is CSS transitions
- Plain CSS: `src/index.css` (tokens) and `src/App.css` (everything else)
- `oxlint` for linting; Node and Playwright for regression tests.

## Scripts

```sh
npm install
npm run dev       # http://localhost:5173
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
## API and authentication

The backend lives in [fontes-api](https://github.com/MateusAMP2119/fontes-api),
pinned as a Git submodule at `services/api`. It is one TypeScript Worker with
Better Auth and D1 for authentication, organizations and projects.

```sh
npm ci
npm run setup:api
cp services/api/.dev.vars.example services/api/.dev.vars
# Add Google credentials there if testing Google login.
npm run dev
```

Open `http://localhost:5173`. The app proxies API requests to the local Worker on
port 8787. Migrations use local D1 and verification/reset emails appear at
`http://localhost:5173/__dev/mail`. Scalar docs are at
`http://localhost:5173/api/auth/docs`. No Rust installation is required.

```sh
npm run test:api
npm run test:ui  # requires npm run dev in another terminal
npm run build
npm run lint
```

The submodule pins the API version; frontend builds and Pages deployment do not
require cloning it. Deploy the API separately with its configured secrets and
routes before releasing the app. See [integration notes](docs/api.md).
