# Onboarding reliability changes

The email journey verifies ownership with an OTP, then requires password setup when the account has neither a credential password nor Google authentication. Existing OTP accounts keep their identity and memberships. Returning users can sign in with a password; OTP remains available as a fallback. Google accounts are not required to add a password.

Password creation uses `/api/onboarding/password`, which requires a verified session created within the last 15 minutes. Better Auth owns password hashing and credential storage. Passwords accept 8 to 128 characters. Setup requests never enter the onboarding outbox. A lost password-save response is reconciled through bootstrap. `/reset-password` handles reset requests and single-use reset links; `/account/password` changes an existing password and revokes other sessions. Password reset revokes existing sessions. Reset requests preserve invitation and same-origin content context.

Completion opens the app only after the server acknowledges the final save. Pending work survives refresh where browser storage is available. Server revisions resolve stale changes, and membership loss prevents a locally cached completed record from granting entry. Unsaved drafts are isolated by identity; account switching clears the active draft, including profile images. Existing organizations resume profile setup instead of creating a duplicate workspace.

Invitations are reviewed before acceptance. The API checks recipient identity and current inviter authority; joiners cannot rename the workspace or access owner invitation controls. Optional invitation failures are tracked per recipient with resend/removal actions and do not hold up other recipients or completion. Each invitation is bound to its originating workspace. Copying a link waits for server confirmation and offers manual copying if clipboard access fails. Expired links cannot report success.

Profile images are saved and explicitly removable. Defaults from Google can be retained. Image decoding is guarded against late completion after navigation or identity changes. Authentication and bootstrap show progress; authentication requests time out after 20 seconds. Rate-limited onboarding requests respect Retry-After when supplied. Error messages remain visible until navigation or a new operation replaces them.

## Release order

Deploy the matching API from `/Users/mateuscosta/Documents/ChatGPT/Fontes general work/work/fontes-api` before deploying this app. The API change uses existing account, user, membership and onboarding tables and adds no migration. The existing onboarding migration must already be installed. Keep the current email templates and MIME sender unchanged.

Automated validation does not send real email or complete real Google authorization. Automated tests use isolated databases and mocked email/OAuth transports.

## Verification

With Vite on port 5183:

```sh
TEST_ORIGIN=http://127.0.0.1:5183 node --test scripts/auth-regression.test.mjs scripts/onboarding-background.test.mjs scripts/onboarding-flows.test.mjs
ONBOARDING_TEST_URL=http://127.0.0.1:5183/onboarding-preview node scripts/onboarding-progress.test.mjs
ONBOARDING_TEST_URL=http://127.0.0.1:5183/onboarding-preview node scripts/onboarding-mobile.test.mjs
ONBOARDING_TEST_URL=http://127.0.0.1:5183/onboarding-preview node scripts/onboarding-preview.test.mjs
npm run build
npm run lint
```

In the API checkout, run `npm test`, `npm run typecheck` and `npm run build`. Tests cover real onboarding SQL plus the production Better Auth configuration with an isolated memory adapter. Password hashing, OTP migration, password login, reset token reuse and session revocation are exercised without sending emails.

The broader 113-scenario flow inventory remains an acceptance catalogue. Conditional billing/SSO/approval features, activation analytics, real email delivery and external-provider outages are not represented as implemented or production-verified by this change.


## Responsive synchronization

Email submission opens the code form immediately with an accurate sending state. A submitted code can open an editable workspace draft while verification finishes; workspace submission remains disabled until authentication and required password setup are confirmed. Failed requests return to the appropriate form with the input preserved.

Workspace submission opens the profile form immediately. Creation continues in the background, but profile submission remains disabled until the workspace is confirmed. Late responses never navigate away from the current form.

The workspace URL is never asked for. It is derived from the workspace name, and the write enforces uniqueness: a conflict is retried up to three times with a fresh random suffix before the correction form asks for another name.

Valid profile and preference edits are coalesced after a 500 ms typing pause and saved in the background. Saving, saved and failed states remain visible. Passwords and OTPs never enter this process, and background saving never marks onboarding complete.

## Invitation completion regression (10 September 2026)

The live invitation email and acceptance succeeded, but a new member's completion
request contained an empty workspace name and slug. Acceptance had reset the draft
to defaults, and restoration treated those empty values as preserved local edits.
The API correctly rejected the invalid setup payload.

Acceptance now seeds the draft from the join response. For members without workspace
editing rights, restoration uses the confirmed workspace identity and repairs matching
queued profile/completion snapshots, retaining profile edits and preferences. The
stepper also disables workspace and invitation shortcuts unavailable to that member.

The browser API fixture now rejects blank workspace identity like the real API.
Regression coverage includes fresh acceptance and reloading a previously rejected
completion snapshot without losing the member's edits.
