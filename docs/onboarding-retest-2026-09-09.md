# Onboarding retest, 9 September 2026

## Failures reproduced and fixed

- Email verification rendered workspace setup before discovering that password setup was required. It now opens password drafting first and gates submission on the verified session.
- Password submission blocked the form until its save and bootstrap completed. Workspace drafting now opens immediately; workspace creation still waits for confirmed credentials. Password failure restores the password step and preserves the workspace draft.
- A new email account with an empty name could not create a workspace because the request lacked a profile name. A default derived from the account email is supplied until the profile is edited.
- Sign-out displayed the previously completed onboarding screen with a disabled completion button. Session loss now clears account-specific form state. Explicit account switching still opens email entry.
- WebKit retried bootstrap from a document being unloaded during password saving. Navigation now prevents that stale follow-up; returning from the browser back-forward cache restores synchronization.

- A stale signup draft overrode direct navigation to `/login`. Explicit login now opens the returning-user form. This was retested in Chromium, WebKit and live Safari after account deletion.

## Verification

Live Safari: Gmail verification retrieval, email signup, user-submitted password, workspace creation, profile edit with immediate reload, back navigation through workspace setup, invitation skipping, preferences restoration on reload, server-confirmed completion, sign-out, returning email-code access, and the login screen after deletion. The password transition was exercised using controlled browser responses because real credential creation requires user interaction.

Controlled Chromium: 25 tests across authentication, background saving, flow recovery, and app reload/update behavior. Controlled WebKit: 20 flow tests. Coverage includes delayed email/OTP/password/workspace requests, invalid OTP, rejected password, reload during password saving, failed confirmation after successful password saving, explicit and automatic slug conflicts, stale responses, throttling, access loss, conflicting revisions, invitation acceptance and failures, clipboard fallback, account switching, sign-out, reset destinations, and credential exclusion from local/session storage.

Mobile Chromium and WebKit: all onboarding screen anchors, readable inputs, viewport resizing, scroll reachability, restored progress and step counts. Production PWA: installability, offline root/deep links, reconnection, static-only caching, and update activation while a tab remains open.

These checks cover the exercised flows; they do not establish zero network latency or prove every possible external-provider failure. No invitations were sent and optional subscriptions remained disabled during the live test.

## Cleanup

The live test account and its sole-member test workspace were deleted after testing. Database checks confirmed zero remaining user, credential, session, membership, workspace or project records for this test identity. Account deletion used the administrative database interface; the app currently has no account-deletion menu item. Live password login and password recovery submission were not performed; their request and state handling were tested with controlled responses.
