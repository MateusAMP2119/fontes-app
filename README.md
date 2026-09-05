# Fontes

News dashboard builder on a freeform canvas, for building views on Iris. Visual
language follows Apple Freeform: full-bleed dotted board, floating pills, SF Pro
system stack.

All news data is mocked — there is no backend and no network layer.

## Stack

- Vite + React 19 + TypeScript
- `motion` for the board cross-fade; everything else is CSS transitions
- Plain CSS: `src/index.css` (tokens) and `src/App.css` (everything else)
- `oxlint` for linting. No test runner is currently wired up.

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
# Local authentication

Run `npm run dev` from this directory, then open `http://localhost:5173`.
This starts Vite and the local auth Worker together. The Worker connects to the
cloud D1 database `fontes-auth`, also visible in Cloudflare Studio. Keep this port
fixed: Google callbacks and browser cookies must belong to
the same origin. Closing the command stops both servers.

For Google sign-in:

1. Copy `.dev.vars.example` to `.dev.vars` if that file does not already exist.
2. Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` to the existing web client's
   credentials. Keep this file private; it is gitignored.
3. Add `http://localhost:5173/api/auth/callback/google` to that client's
   **Authorized redirect URIs** in Google Cloud Console, preserving existing URLs.
4. Restart `npm run dev` after changing credentials.

Users, organizations, memberships and projects use cloud D1, shared with production.
The email binding also uses Cloudflare: signup and reset requests send real emails.
Story data comes from the deployed site.
Google sign-in requires real OAuth credentials; placeholders cannot complete the
code exchange. Startup does not apply database migrations automatically.

Apply auth migrations explicitly with:

```sh
npx wrangler d1 migrations apply fontes-auth --remote --config wrangler.auth.jsonc
```

In Cloudflare Studio, inspect `user`, `account`, `organization`, `member` and `project`.
For a joined overview:

```sql
SELECT u.email, o.name AS organization, m.role, p.name AS project
FROM user u
LEFT JOIN member m ON m.userId = u.id
LEFT JOIN organization o ON o.id = m.organizationId
LEFT JOIN project p ON p.organizationId = o.id;
```

With the dev server running, run `node --test scripts/auth-regression.test.mjs`.
These browser tests mock auth responses and never create accounts or send email.
They cover password-manager fills without change events, submission, confirmation,
password reset and native-control spacing. They do not automate Apple Keychain
or complete a real Google login.
