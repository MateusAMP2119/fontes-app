# Onboarding flow and verification, 9 September 2026

The published onboarding keeps every forward onboarding form usable while earlier requests finish. Earlier failures are corrected on the current screen. Server-confirmed credentials, workspace, project and matching profile remain required before the app opens. After an explicit final click, optional preferences and the completion marker can finish through the persisted background queue.

## Screen purposes

| Screen | Purpose | Required or optional |
| --- | --- | --- |
| Criar conta | Select email registration, Google or an existing account | Entry choice |
| Registo com email | Collect the registration email | Email registration |
| Confirmar email | Verify access to the email address | Email registration |
| Definir palavra-passe | Create a reusable password | New email accounts |
| Novo ambiente de trabalho | Set the workspace name, the URL is generated from it | Workspace owners |
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
- Completed onboarding is rechecked after the restored screen renders, preventing a completed account from getting stuck on preferences after reload. The full-flow regression now includes completion, reload, sign-out and password login without an extra configuration save.
- Image processing continues across forward navigation and is included before confirmed entry. Removing an image also cancels an unfinished replacement.
- Added visible password/recovery labels, stable action text, inline validation and clearer screen names. Failed password login retains its in-memory input for retry.

## Verification

The latest screen-presentation build contains asset `index-Bcyi8BkQ.js`, SHA-256 `ac51af19eaf1beeace9622989bc23b1331729bad799f766c0b6841c9dd6659af`. The preceding live release was code commit `5708ca320797b86282d55c3649bb125fe84cfec2`; its live evidence remains recorded below.

| Requirement | Evidence |
| --- | --- |
| Full email signup and ordered saving | Browser tests complete the full flow, including reaching the final screen before stalled verification resolves |
| Failure recovery without automatic backward navigation | Invalid/late codes, failed password, expired authentication, generated URL collision and final cross-tab conflict tests |
| No lost final edits | Preference changes during final confirmation, queued profile/preferences/invites, conflict and reload tests |
| Tab isolation and bounded request count | Two-tab draft preservation with at most six configuration fetches during the test, replacing the reproduced request storm |
| Optional invitations do not block completion | An unresolved invitation stays in flight while confirmed setup opens the app |
| Credential safety and correct account gates | Browser-storage checks, account switching, revoked access, explicit login and controller authorization tests |
| Recovery and optional images | Password recovery/change, visible labels in both themes, image resizing, reload, removal and corrupt-image retry tests |
| Layout and mobile behavior | All nine preview screens in Chromium and WebKit; viewport resizing, scroll reachability, focus, progress counts, input sizing and no overflow |
| Build/runtime | Build and lint succeed; hook/fast-refresh lint warnings and the bundle-size warning remain |

Final verification results:

- Production-build Chromium: 49 tests passed, zero failures, including Google callbacks at both `/` and `/login`.
- Production-build WebKit: 44 tests passed, zero failures, including Google callbacks at both `/` and `/login`.
- API onboarding controller with real SQL in SQLite: 12 tests passed, zero failures. Auth and email transport are substituted in these isolated controller tests.
- Preview, mobile, progress and layout checks passed.
- Service-worker checks passed: installation, offline navigation, mounted form preservation, reconnection and static-only caching.
- Captured 18 desktop/mobile onboarding screens and four auth/recovery routes, with no horizontal overflow.

WebKit service-worker fetches bypass Playwright's route interception. API simulations therefore block service workers; the separate service-worker suite exercises worker behavior with the worker enabled. An initial production WebKit run exposed this test setup problem, which was reproduced and corrected without changing production worker behavior.

## Timing evidence

A controlled local Chromium run added 750 ms to every API response. Forward transitions from code through preferences took 34 to 52 ms. Final entry took 3,836 ms because it waited for all outstanding required responses. This is a controlled browser measurement, not a production latency benchmark. No fabricated success or zero-network-time claim is made.

## Live production verification

Publication was explicitly authorized. A fresh account, `mateus+onboarding@fonteslabs.com`, completed the actual deployed email flow with a generated password: email delivery and verification, password creation, workspace creation, profile name and image upload, invitation-link creation, optional email preferences and confirmed app entry. No API responses were mocked. Email invitations to other people were skipped.

The first release (`9f3662c`) saved completion, password, workspace and profile image correctly, but its live reload check exposed a restoration bug: preferences remained visible despite server-confirmed completion. The regression reproduced locally before the correction in `5708ca3`, and the complete Chromium and WebKit suites passed afterward. On the corrected live release, the same account passed reload, sign-out and password login. A separate fresh browser session also passed password login, reload with the saved profile image, and sign-out; each captured screen loaded `index-Q6FMOOSS.js`. Required API calls returned HTTP 200 and no browser exceptions were observed. Both test browsers were signed out and closed.

The existing test tab retained its cached previous build during the first deployment reload. A subsequent reload used the update. Fresh-browser verification independently confirmed the corrected served asset. This does not imply that an already open tab instantly replaces its executing JavaScript when a release is published.

Live signup forward transitions measured 19 to 45 ms, final confirmed entry 1,332 ms, and returning password login 1,326 ms in this single run. These timings include browser automation overhead and are not a latency guarantee. Required authentication and persistence still take network time; forms remain usable while earlier requests finish.

The authorized test alias initially received no code. An exact Cloudflare Email Routing rule was added for `mateus+onboarding@fonteslabs.com`, forwarding to the existing verified inbox. Email delivery then succeeded. The original email rule and domain-wide subaddress settings were unchanged; the alias rule remains available for account recovery. Its rule ID is `5dd6b979ec264cd386431191c176af72`.

Live evidence is saved in the workspace's `docs/onboarding-fix-verification-2026-09-09/deployed/` and `deployed-returning/` folders: screenshots, sanitized request timings, server-confirmed configuration summaries and final asset paths. Generated credentials are stored separately in a private file with mode 0600, outside the repository.

Physical-phone behavior has not been exercised live in this pass. Invitation email delivery to another person was not exercised. Passing this coverage does not prove that all possible defects are absent. Build and lint warnings described above remain.

## Final-button pause and Google follow-up

The user clarified that the last button eventually opens the app after a short pause. This was a blocking final save, not an indefinite hang. Once the workspace, project, credentials and exact profile are already confirmed, the final click now opens that workspace while the optional preferences and completion marker finish in the persisted queue. Authentication, workspace creation, unsaved profile changes, image processing and unresolved conflicts still prevent entry. A late expired session, revoked access or conflict blocks the app and preserves the draft for correction. Offline completion retries survive reload without inventing a server completion result.

The regression deliberately holds the final response indefinitely and verifies that the confirmed app opens before it is released. It then verifies the queued preferences, server acknowledgement and reload. Further tests cover late conflicts, expired authentication and revoked access after entry. Existing incomplete-password, stalled-workspace and image-processing tests continue to pass.

A real Google signup was completed in the in-app browser using `mateuscosta464@gmail.com`: Google authentication, workspace `Fontes Google QA`, existing Google name/image, invitation skip, default-off email preferences, final app entry, reload, sign-out and returning Google login. The browser was signed out afterward. No password was created for this Google account. This live run used the preceding release and exposed a real progress defect: the four Google steps were labelled 4/7 through 7/7. The follow-up preserves the Google entry path across the authentication redirect and reload, including callbacks to `/login`; its regression verifies 1/4 through 4/4 without email-code or password setup.

The changed final-entry behavior and corrected Google counters are covered by production-build browser tests. The live Google run described here must not be mistaken for a new-account run of the follow-up build.

## Previous Google presentation change, superseded on 10 September

The user identified a logo-only pause immediately after returning from Google. Two loading branches rendered the brand before session/setup confirmation supplied the first form. The previous patch kept only the background during confirmation, then painted the logo and form together. That removed the logo-only stage but left a blank page. The user reproduced this on both Google signup and login. It was an incomplete fix, superseded by the mounted-page handoff below. An already visible email/login form remains mounted during the setup check, with duplicate authentication submissions disabled.

The new browser regression holds session and setup responses separately and samples animation frames. It verifies zero frames with a logo but no form, followed by the correct first Google setup screen. A second regression verifies that the complete email login form remains visible until authenticated entry is ready. The existing completed-account regression still checks that signup never flashes during restoration.

Signup panels now share a 360px maximum width, including the final Começar action. Phone forms use the available width instead of the former 270px cap. Email, confirmation code, workspace, profile and invitation labels stay visible after typing. The first document also preloads the existing mark and font. No new transition delay, progress animation or spinner was added.

The final markup was checked through the full signup preview and mobile suites in Chromium and WebKit. Mobile tests cover fixed brand anchors, keyboard-height viewport changes, readable inputs, scroll reachability and horizontal overflow. All 18 desktop/mobile screen captures and four recovery/auth captures are available in the workspace folder `docs/onboarding-screen-polish-2026-09-09/`.


## Google signup and login handoff, 10 September 2026

Both Google entry points now keep the original Fontes document mounted. A sign-in window handles Google, then signals the original page using an unpredictable attempt identifier. The original page refetches the real server session and prepares the authenticated onboarding step or existing workspace. Only after React commits that destination does the window close. The original path, invitation and return destination stay in the original document throughout the flow.

The return page sends no identity, tokens or credentials to the original page. Window messages require the expected origin, window and attempt. A same-origin BroadcastChannel supports provider window isolation. A signal without a server-confirmed session cannot open setup or the app. Cancel, blocked windows, provider errors and network failures preserve the original form and allow retry. The original page also provides cancellation if the sign-in window is inaccessible.

The service worker excludes both the `.html` callback and Cloudflare’s canonical extensionless URL, including their query strings. Workbox tests pathname plus query, so a regex ending immediately after `.html` was insufficient; the worker-enabled regression covers this case. The app uses `same-origin-allow-popups` for the OAuth window, consistent with [Google's popup integration guidance](https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid#cross_origin_opener_policy).

Verification now checks the stronger invariant: no blank frames and no document reload while session and setup responses are independently stalled. Both signup and returning login are covered. Additional tests cover full four-step Google onboarding, completion and reload, destination preservation, popup and original-page cancellation, popup blocking, provider/network failures, retry, unverified completion and unrelated messages. Existing email, final-button, persistence, conflict, image and authentication regressions remain in the suite.

Real OAuth cannot be verified from localhost against production in Safari: its cross-site state cookie was unavailable and Google returned `state_mismatch`. This is separate from the production app and API, which share the Fontes site. Production verification is recorded with release evidence in the workspace's `docs/google-handoff-2026-09-10/` folder.


Safari's live Google flow also exposed a disconnected WindowProxy reporting `closed` while the Google window was still open. The previous polling check incorrectly cancelled that attempt. Cancellation now requires the explicit cancel action or the bounded timeout. Closing a provider window with its browser close button leaves cancellation available on the original Fontes form. A regression uses a genuinely isolated cross-origin provider page and verifies that its eventual callback still completes and closes through BroadcastChannel.
