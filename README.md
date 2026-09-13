# Fontes

News dashboard builder on a freeform canvas, for building views on Iris. Visual
language follows Apple Freeform: full-bleed dotted board, floating pills, SF Pro
system stack.

This repository contains the frontend only. Authentication and projects use the
external API at `https://api.fonteslabs.com`; news views also call an external API.
Dashboard visualization fixtures remain mocked.

## Stack

- Vite + React 19 + TypeScript
- `motion` for the board cross-fade; everything else is CSS transitions
- Plain CSS: `src/index.css` (tokens) and `src/App.css` (everything else)
- `oxlint` for linting. Auth UI checks use Node’s test runner and Playwright.

## Scripts

```sh
npm install
npm run dev       # https://local.fonteslabs.com:5173
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
## API configuration

Both local and deployed frontends use `https://api.fonteslabs.com` for
accounts and workspaces, and `https://fontes-api.bymarreco.com` for news.
There are no API environment overrides or simulated application routes.

The local frontend runs at `https://local.fonteslabs.com:5173`, bound only to
loopback. HTTPS and the shared `fonteslabs.com` site preserve the production
session-cookie and Google sign-in behavior in Safari. No local API is required.
Local actions use production accounts and data.

One-time setup on each Mac:

```sh
npm run setup:local
```

Then run `npm run dev` and open `https://local.fonteslabs.com:5173`.
Certificates are private to the machine and ignored by Git. Cloudflare builds
do not need them. The production API trusts that exact HTTPS frontend origin.

The news service at `https://fontes-api.bymarreco.com` serves `/stories`,
`/stories/:id`, `/events` and `/events/:id`. It allows public cross-origin reads;
news calls do not send session cookies. Authentication and projects remain on
`https://api.fonteslabs.com`.
Publisher icons load directly from DuckDuckGo's icon service.

## Progressive web app

Production builds generate a web app manifest and service worker with
`vite-plugin-pwa`. Install Fontes from the browser's install menu on desktop or
Android; on iPhone/iPad, use Safari's Share → Add to Home Screen. Installation
requires HTTPS (localhost also works for testing).

The worker precaches bundled frontend assets, fonts and icons. Opening the app
offline, including a deep link, shows a Portuguese connection screen and resumes
when connectivity returns. Losing connectivity in an open app shows a banner
without unmounting the workspace. Authentication, news and server synchronization
still require a connection; API responses and credentials are never added to the
service worker cache. Icons use the existing Fontes mark.

New versions wait until all Fontes windows/tabs are closed before activating, so
an update does not reload an active workspace. The worker is disabled in Vite dev
mode. To verify installation and offline behavior locally, run `npm run build`,
then `npm run preview`, then `node scripts/pwa.test.mjs` in a second terminal.
The browser check mocks external APIs and does not create accounts or send email.

## Deployment

Cloudflare Workers Builds deploys this as an assets-only Worker named `fontes-app`:

- Build command: `npm run build`
- Deploy command: `npx wrangler deploy`
- Root directory: repository root

`wrangler.jsonc` serves `dist` with SPA fallback for routes such as `/login`.
The custom domains are `app.fonteslabs.com` and `www.app.fonteslabs.com`.
There are no Worker scripts, Pages functions, database bindings or migrations.
Every push to `main` runs `.github/workflows/deploy.yml`, which triggers the
Cloudflare Workers Builds deploy hook stored in the GitHub repository secret
`CLOUDFLARE_DEPLOY_HOOK_URL`. The hook must target `main` for `fontes-app`.
GitHub checks that Cloudflare accepted the build; build and deployment completion
are reported in Cloudflare's build history. The hook URL is never committed.
For a manual deployment, run `npm run deploy`.

## Auth UI regression checks

With Vite running, `node --test scripts/onboarding-background.test.mjs` verifies
workspace confirmation, URL collisions and completion during a sync outage.
`node scripts/onboarding-mobile.test.mjs` checks mobile layout
stability and input sizing. `node scripts/onboarding-progress.test.mjs` covers
restored flows and step counts in Chromium and WebKit.

With the dev server running, run `node --test scripts/auth-regression.test.mjs`.
These browser tests mock auth responses and never create accounts or send email.
The flow suite in `scripts/onboarding-flows.test.mjs` covers password setup, login,
reset, invitation acceptance, sync recovery and return destinations. They do not complete a real Google login.

## Signup and onboarding

The shared `Onboarding.tsx` screens serve `/` and `/login`. New email accounts
verify ownership by code and set a password before workspace setup. Returning
accounts can use a password or email-code fallback. Google accounts do not need
a password. Recovery and password changes are available at `/reset-password` and
`/account/password`.

Workspace creation runs behind an immediately editable profile form. Profile
submission and final completion wait for server confirmation. Pending
changes are scoped to the account and workspace; passwords and OTPs are never
stored in the onboarding draft. Existing workspaces resume setup, invitation
acceptance is explicit, and failed invitation deliveries can be retried or removed
individually. See [onboarding reliability](docs/onboarding-reliability.md) for the
full behavior, tests and API-first release order.

Onboarding regression tests intercept API calls outside the application code.
Run `scripts/onboarding-flows.test.mjs` against a test server with `TEST_ORIGIN`.
These tests do not send email or create remote accounts.

The profile screen's mark comes from DiceBear's nine face-only styles, `adventurerNeutral`,
`avataaarsNeutral`, `bigEarsNeutral`, `botttsNeutral`, `croodlesNeutral`, `loreleiNeutral`,
`notionistsNeutral`, `pixelArtNeutral` and `thumbs`, seeded with the email and drawn in the
browser, so nothing is generated by hand and no seed leaves the device. None of them draws
hair, skin or a body, which is the point: the styles that draw a person also draw a gender,
and turning micah's beard, earrings, eyelashes, eye shadow, lipstick and long hair off still
left one. The seed picks the style as well as the face; the ground takes the app's own violets
and teals, and thumbs, the one style that colours its shape too, stays pale. Both themes hold.
The nine cost about 190KB gzipped in the entry chunk, and the other twenty-two styles in
`@dicebear/collection` are tree-shaken out (checked in `dist/`).

Tapping the mark opens a file picker instead: the picture is cropped square and redrawn at
160px WebP in the browser (about 2KB), carried in the draft, and sent as `profileImage` on
the setup payload, which the onboarding API has to accept alongside `profileName`. The cross
badge, shown on hover, clears it back to the generated mark. The picker's own input sits
outside the row, because inside a `<label>` every click in the row forwards to it.

Release the matching fontes-api onboarding migration/API before this frontend.

Before starting a local server, check `git status --short --branch` and synchronize
with GitHub after preserving any uncommitted work. Separate clones have independent
working files and can otherwise show different onboarding versions.
