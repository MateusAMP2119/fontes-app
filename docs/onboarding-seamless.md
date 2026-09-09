# Onboarding flow and verification, 9 September 2026

The candidate keeps every forward onboarding form usable while earlier requests finish. Earlier failures are corrected on the current screen. Server-confirmed credentials, workspace, project and completion remain required before the app opens.

## Screen purposes

| Screen | Purpose | Required or optional |
| --- | --- | --- |
| Criar conta | Select email registration, Google or an existing account | Entry choice |
| Registo com email | Collect the registration email | Email registration |
| Confirmar email | Verify access to the email address | Email registration |
| Definir palavra-passe | Create a reusable password | New email accounts |
| Novo ambiente de trabalho | Set the workspace name and URL | Workspace owners |
| Personalizar perfil | Set the visible name and optional image | Name required, image optional |
| Convidar membros | Create a link or invite recipients | Optional |
| Preferências de email | Choose optional email subscriptions and finish | Both subscriptions default off |
| Iniciar sessão | Access an existing account using password or email code | Returning users |
| Recuperar acesso / Definir nova palavra-passe | Request a recovery link and replace a forgotten password | Recovery branch |
| Convite para ambiente | Review and explicitly accept an invitation | Invited members; skips owner workspace setup |

## Changes

- Removed the delayed exit/enter screen transition and separate loading text. Brand, theme and layout remain consistent across signup, restoration and recovery.
- Profile, invitations and preferences remain available while verification, password creation and workspace creation are pending.
- Invalid codes, failed passwords, expired authentication and workspace errors are corrected inline, preserving the current draft and completion intent.
- Each tab owns its unfinished draft. Shared storage changes only prompt a refresh for a newer server revision, preventing the request feedback loop.
- Cross-tab conflicts preserve the local draft for explicit confirmation, including after a reload. A competing completed setup cannot silently replace the draft or open the app.
- Optional invitation delivery runs independently of required configuration saves. Early invitation/link requests wait for the confirmed workspace and then continue automatically.
- The password endpoint's confirmed configuration is used directly, removing an extra fetch. Continuing from an already saved profile avoids a duplicate save.
- The final save includes preference changes made while confirmation was in flight. Credentials and codes are never persisted in browser storage.
- Added visible password/recovery labels, stable action text, inline validation and clearer screen names. Failed password login retains its in-memory input for retry.

## Verification

The current production candidate contains `index-Cyfi5Q4F.js`, SHA-256 `1ff338044be2b345115a281ba35e8781e19d521842657a8317ae455a1272ec25`.

| Requirement | Evidence |
| --- | --- |
| Full email signup and ordered saving | Browser tests complete the full flow, including reaching the final screen before stalled verification resolves |
| Failure recovery without automatic backward navigation | Invalid/late codes, failed password, expired authentication, manual URL collision and final cross-tab conflict tests |
| No lost final edits | Preference changes during final confirmation, queued profile/preferences/invites, conflict and reload tests |
| Tab isolation and bounded request count | Two-tab draft preservation with at most six configuration fetches during the test, replacing the reproduced request storm |
| Optional invitations do not block completion | An unresolved invitation stays in flight while confirmed setup opens the app |
| Credential safety and correct account gates | Browser-storage checks, account switching, revoked access, explicit login and controller authorization tests |
| Recovery and optional images | Password recovery/change, visible labels in both themes, image resizing, reload, removal and corrupt-image retry tests |
| Layout and mobile behavior | All nine preview screens in Chromium and WebKit; viewport resizing, scroll reachability, focus, progress counts, input sizing and no overflow |
| Build/runtime | Build and lint succeed; existing lint warnings and bundle-size warning remain |

Final verification results:

- Production-build Chromium: 39 tests passed, zero failures.
- Production-build WebKit: 34 tests passed, zero failures.
- API onboarding controller with real SQL in SQLite: 12 tests passed, zero failures. Auth and email transport are substituted in these isolated controller tests.
- Preview, mobile, progress and layout checks passed.
- Service-worker checks passed: installation, offline navigation, mounted form preservation, reconnection and static-only caching.
- Captured 18 desktop/mobile onboarding screens and four auth/recovery routes, with no horizontal overflow.

WebKit service-worker fetches bypass Playwright's route interception. API simulations therefore block service workers; the separate service-worker suite exercises worker behavior with the worker enabled. An initial production WebKit run exposed this test setup problem, which was reproduced and corrected without changing production worker behavior.

## Timing evidence

A controlled local Chromium run added 750 ms to every API response. Forward transitions from code through preferences took 34 to 52 ms. Final entry took 3,836 ms because it waited for all outstanding required responses. This is a controlled browser measurement, not a production latency benchmark. No fabricated success or zero-network-time claim is made.

## Live boundary and remaining release work

The earlier deployed build completed fresh production signup, password creation, workspace/profile creation, invitation-link creation, final completion, reload and password sign-in using the authorized test account. That evidence is separate from the candidate verification.

The candidate's static production assets were also served in an isolated browser at the production app origin, with all authentication/configuration calls going to the real production API. Returning password login, reload and sign-out passed; all relevant API responses were HTTP 200, no browser errors were recorded, and login took 1,350 ms. The test browser was signed out afterward. No new signup or account reset was performed in this candidate live test.

The candidate has not been published. Release and a fresh-account live signup on the updated build remain outstanding. Google authorization and physical-phone behavior have not been exercised live in this pass. Passing this coverage does not prove that all possible defects are absent.
